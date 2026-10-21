package com.digivault.config;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.WriteConcern;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.util.concurrent.TimeUnit;

@Configuration
public class MongoConfig {

    private static final Logger logger = LoggerFactory.getLogger(MongoConfig.class);

    @Value("${spring.data.mongodb.uri:${SPRING_DATA_MONGODB_URI:${MONGODB_URI:mongodb://localhost:27017/docuvault_db}}}")
    private String rawUri;

    @Bean
    @Primary
    public MongoClient mongoClient() {
        String uri = rawUri;
        if (uri == null || uri.trim().isEmpty()) {
            uri = System.getenv("SPRING_DATA_MONGODB_URI");
        }
        if (uri == null || uri.trim().isEmpty()) {
            uri = System.getenv("MONGODB_URI");
        }
        if (uri == null || uri.trim().isEmpty()) {
            uri = "mongodb://localhost:27017/docuvault_db";
        }

        // Sanitize connection URI: strip trailing newlines, spaces, quotes
        uri = uri.trim();
        while (uri.endsWith("\n") || uri.endsWith("\r") || uri.endsWith(" ") || uri.endsWith("\t") || uri.endsWith("\"") || uri.endsWith("'")) {
            uri = uri.substring(0, uri.length() - 1).trim();
        }
        while (uri.startsWith("\"") || uri.startsWith("'")) {
            uri = uri.substring(1).trim();
        }
        uri = uri.replace("majority\\n", "majority").replace("majority\n", "majority");

        logger.info("Initializing sanitized MongoDB client connection (length: {} chars)", uri.length());

        ConnectionString connectionString = new ConnectionString(uri);

        MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(connectionString)
                .writeConcern(WriteConcern.MAJORITY)
                .applyToSocketSettings(builder -> {
                    builder.connectTimeout(15, TimeUnit.SECONDS);
                    builder.readTimeout(15, TimeUnit.SECONDS);
                })
                .applyToClusterSettings(builder -> {
                    builder.serverSelectionTimeout(15, TimeUnit.SECONDS);
                })
                .build();

        return MongoClients.create(settings);
    }
}
