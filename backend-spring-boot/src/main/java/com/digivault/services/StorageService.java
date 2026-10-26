package com.digivault.services;

import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.client.builder.AwsClientBuilder;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.PutObjectRequest;
import com.amazonaws.services.s3.model.S3Object;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Storage Service
 * Handles physical document storage.
 * Supports Cloudflare R2 (S3-compatible) with automated fallback to local disk storage.
 */
@Service
public class StorageService {

    private static final Logger logger = LoggerFactory.getLogger(StorageService.class);

    @Value("${digivault.storage.type:local}")
    private String storageType;

    @Value("${digivault.storage.upload-dir:./storage_uploads}")
    private String uploadDirStr;

    @Value("${digivault.storage.r2.account-id:}")
    private String r2AccountId;

    @Value("${digivault.storage.r2.access-key-id:}")
    private String r2AccessKeyId;

    @Value("${digivault.storage.r2.secret-access-key:}")
    private String r2SecretAccessKey;

    @Value("${digivault.storage.r2.bucket-name:}")
    private String r2BucketName;

    @Value("${digivault.storage.r2.public-url:}")
    private String r2PublicUrl;

    private Path storageLocation;
    private AmazonS3 s3Client;
    private boolean r2Configured = false;

    @PostConstruct
    public void init() {
        // Initialize local directory buffer
        this.storageLocation = Paths.get(uploadDirStr).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageLocation);
            logger.info("Local storage directory initialized at: {}", this.storageLocation);
        } catch (IOException e) {
            logger.warn("Could not create local storage directory: {}", e.getMessage());
        }

        // Initialize Cloudflare R2 if credentials or storage type are provided
        if (isR2Enabled()) {
            try {
                BasicAWSCredentials credentials = new BasicAWSCredentials(
                        r2AccessKeyId.trim(),
                        r2SecretAccessKey.trim()
                );
                String endpoint = "https://" + r2AccountId.trim() + ".r2.cloudflarestorage.com";

                this.s3Client = AmazonS3ClientBuilder.standard()
                        .withEndpointConfiguration(new AwsClientBuilder.EndpointConfiguration(endpoint, "auto"))
                        .withCredentials(new AWSStaticCredentialsProvider(credentials))
                        .withPathStyleAccessEnabled(true)
                        .build();

                this.r2Configured = true;
                logger.info("Cloudflare R2 Object Storage successfully connected for bucket '{}' at endpoint '{}'", r2BucketName, endpoint);
            } catch (Exception e) {
                logger.error("Failed to initialize Cloudflare R2 S3 client: {}. Falling back to local storage.", e.getMessage(), e);
                this.r2Configured = false;
            }
        } else {
            logger.info("Storage operating in LOCAL disk mode (Cloudflare R2 credentials not supplied).");
        }
    }

    public boolean isR2Enabled() {
        boolean explicit = "r2".equalsIgnoreCase(storageType) || "s3".equalsIgnoreCase(storageType);
        boolean hasCreds = StringUtils.hasText(r2AccountId)
                && StringUtils.hasText(r2AccessKeyId)
                && StringUtils.hasText(r2SecretAccessKey)
                && StringUtils.hasText(r2BucketName);
        return explicit || hasCreds;
    }

    /**
     * Store multipart file safely with UUID prefix to prevent collisions
     */
    public String storeFile(MultipartFile file) {
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.bin");
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex >= 0) {
            extension = originalFilename.substring(dotIndex);
        }

        String storedFilename = UUID.randomUUID().toString() + extension;

        if (originalFilename.contains("..")) {
            throw new RuntimeException("Cannot store file with relative path outside current directory: " + originalFilename);
        }

        // 1. If Cloudflare R2 is configured, upload directly to R2 bucket
        if (r2Configured && s3Client != null) {
            try {
                ObjectMetadata metadata = new ObjectMetadata();
                metadata.setContentLength(file.getSize());
                if (file.getContentType() != null) {
                    metadata.setContentType(file.getContentType());
                }

                try (InputStream inputStream = file.getInputStream()) {
                    s3Client.putObject(new PutObjectRequest(r2BucketName.trim(), storedFilename, inputStream, metadata));
                }
                logger.info("Stored file in Cloudflare R2 bucket '{}': {}", r2BucketName, storedFilename);

                // Also keep local cached copy for rapid OCR parsing
                try {
                    Path targetLocation = this.storageLocation.resolve(storedFilename);
                    file.transferTo(targetLocation.toFile());
                } catch (Exception ignoreLocal) {}

                return storedFilename;
            } catch (Exception ex) {
                logger.error("Cloudflare R2 upload failed for {}: {}. Attempting local fallback.", storedFilename, ex.getMessage());
            }
        }

        // 2. Local storage fallback
        try {
            Path targetLocation = this.storageLocation.resolve(storedFilename);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
            }
            logger.info("Stored file locally: {}", storedFilename);
            return storedFilename;
        } catch (IOException ex) {
            logger.error("Failed to store file {}", originalFilename, ex);
            throw new RuntimeException("Could not store file " + originalFilename + ". Please try again!", ex);
        }
    }

    public Path getFilePath(String storedFilename) {
        return this.storageLocation.resolve(storedFilename).normalize();
    }

    public Resource loadFileAsResource(String storedFilename) {
        // Check Cloudflare R2 first
        if (r2Configured && s3Client != null) {
            try {
                S3Object s3Object = s3Client.getObject(r2BucketName.trim(), storedFilename);
                byte[] bytes;
                try (InputStream is = s3Object.getObjectContent()) {
                    bytes = StreamUtils.copyToByteArray(is);
                }
                return new ByteArrayResource(bytes) {
                    @Override
                    public String getFilename() {
                        return storedFilename;
                    }
                };
            } catch (Exception ex) {
                logger.warn("Could not retrieve {} from Cloudflare R2: {}. Attempting local read.", storedFilename, ex.getMessage());
            }
        }

        // Local storage read
        try {
            Path filePath = getFilePath(storedFilename);
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("File not found: " + storedFilename);
            }
        } catch (MalformedURLException ex) {
            throw new RuntimeException("File not found: " + storedFilename, ex);
        }
    }

    public byte[] loadFileBytes(String storedFilename) {
        // Check Cloudflare R2 first
        if (r2Configured && s3Client != null) {
            try {
                S3Object s3Object = s3Client.getObject(r2BucketName.trim(), storedFilename);
                try (InputStream is = s3Object.getObjectContent()) {
                    return StreamUtils.copyToByteArray(is);
                }
            } catch (Exception ex) {
                logger.warn("Could not read bytes for {} from Cloudflare R2: {}. Attempting local read.", storedFilename, ex.getMessage());
            }
        }

        // Local file read
        try {
            Path filePath = getFilePath(storedFilename);
            return Files.readAllBytes(filePath);
        } catch (IOException ex) {
            throw new RuntimeException("Failed to read file bytes: " + storedFilename, ex);
        }
    }

    public byte[] loadFileAsBytes(String storedFilename) {
        return loadFileBytes(storedFilename);
    }

    public void deleteFile(String storedFilename) {
        if (r2Configured && s3Client != null) {
            try {
                s3Client.deleteObject(r2BucketName.trim(), storedFilename);
                logger.info("Deleted file from Cloudflare R2: {}", storedFilename);
            } catch (Exception ex) {
                logger.warn("Could not delete {} from Cloudflare R2: {}", storedFilename, ex.getMessage());
            }
        }

        try {
            Path filePath = getFilePath(storedFilename);
            Files.deleteIfExists(filePath);
        } catch (IOException ex) {
            logger.warn("Could not delete physical local file: {}", storedFilename, ex);
        }
    }

    public String getStorageType() {
        return r2Configured ? "CLOUDFLARE_R2" : storageType;
    }
    public void restoreFile(String storedFilename, byte[] bytes) {
        try {
            Files.createDirectories(this.storageLocation);
            Path targetLocation = this.storageLocation.resolve(storedFilename);
            Files.write(targetLocation, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            logger.info("Restored file from database backup onto local disk: {}", storedFilename);
        } catch (IOException e) {
            logger.warn("Could not write restored file to disk: {}", e.getMessage());
        }
    }

}
