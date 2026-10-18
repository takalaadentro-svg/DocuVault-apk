# Build stage
FROM maven:3.8.8-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/docuvault-backend-1.0.0-SNAPSHOT.jar app.jar

ENV SERVER_PORT=8080 \
    SPRING_DATA_MONGODB_URI=mongodb://mongodb:27017/docuvault_db \
    OCR_SERVICE_URL=http://ocr-service:5001/extract-ocr \
    STORAGE_DIR=/app/storage_uploads

RUN mkdir -p /app/storage_uploads

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
