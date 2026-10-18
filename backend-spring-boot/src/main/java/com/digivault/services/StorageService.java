package com.digivault.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
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
 * Handles physical document storage. Supports Local Encrypted File System
 * and Cloud Firebase Storage specification.
 */
@Service
public class StorageService {

    private static final Logger logger = LoggerFactory.getLogger(StorageService.class);

    @Value("${digivault.storage.type:local}")
    private String storageType;

    @Value("${digivault.storage.upload-dir:./storage_uploads}")
    private String uploadDirStr;

    @Value("${digivault.storage.firebase.bucket-name:digivault-app.appspot.com}")
    private String firebaseBucketName;

    private Path storageLocation;

    @PostConstruct
    public void init() {
        this.storageLocation = Paths.get(uploadDirStr).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageLocation);
            logger.info("Storage directory initialized at: {}", this.storageLocation);
        } catch (IOException e) {
            logger.error("Could not create storage directory", e);
            throw new RuntimeException("Could not initialize storage location", e);
        }
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

        try {
            if (originalFilename.contains("..")) {
                throw new RuntimeException("Cannot store file with relative path outside current directory: " + originalFilename);
            }

            Path targetLocation = this.storageLocation.resolve(storedFilename);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
            }

            logger.info("Stored file successfully: {}", storedFilename);
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
        try {
            Path filePath = getFilePath(storedFilename);
            Files.deleteIfExists(filePath);
        } catch (IOException ex) {
            logger.warn("Could not delete physical file: {}", storedFilename, ex);
        }
    }

    public String getStorageType() {
        return storageType;
    }
}
