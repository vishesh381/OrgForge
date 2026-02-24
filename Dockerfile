# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
# No VITE_API_BASE_URL → apiClient defaults to same-origin /api
RUN npm run build

# ── Stage 2: Build backend (with embedded frontend) ───────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS backend-build
WORKDIR /app
COPY backend/mvnw .
COPY backend/.mvn .mvn
COPY backend/pom.xml .
RUN chmod +x mvnw && ./mvnw dependency:go-offline -q
COPY backend/src src
# Embed the React build into Spring Boot's static resources
COPY --from=frontend-build /app/frontend/dist src/main/resources/static
RUN ./mvnw package -DskipTests -q

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=backend-build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
