FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml ./
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-jammy
RUN groupadd --gid 10001 adrith && useradd --uid 10001 --gid adrith --create-home adrith
WORKDIR /app
COPY --from=build --chown=adrith:adrith /build/target/backend-*.jar /app/backend.jar
USER adrith
ENV SPRING_PROFILES_ACTIVE=prod,cloud
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/backend.jar"]
