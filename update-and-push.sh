docker rmi -f aashu1198/bitespeed-backend:v1
docker build --no-cache -t aashu1198/bitespeed-backend:v1 -f Dockerfile .
docker push aashu1198/bitespeed-backend:v1
