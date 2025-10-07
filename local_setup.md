frontend
pnpm build  

root folder
./gradlew clean build -x test -Pbuild-docker-images=false          
(SKIP) RUN JAR FILE:java -Dspring.config.additional-location="api\src\main\resources\application-local.yml" -jar .\api\build\libs\api-0.0.1-SNAPSHOT.jar

.dev folder
docker compose -f dev.yaml build kafbat-ui
docker compose -f dev.yaml up

CSV
name,config
file-source-1,"{\"connector.class\":\"FileStreamSource\",\"tasks.max\":\"1\",\"file\":\"/tmp/input1.txt\",\"topic\":\"topic1\"}"
file-sink-1,"{\"connector.class\":\"FileStreamSink\",\"tasks.max\":\"1\",\"topics\":\"topic1\",\"file\":\"/tmp/output1.txt\"}"