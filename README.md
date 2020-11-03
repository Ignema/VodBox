# VodBox
Video Management Console

# How to run

## 1. Install Docker and then pull the official mongoDB docker image

  ```
  docker pull mongo
  docker run --name <NAME_OF_CONTAINER> -p 27017:27017 mongo
  ```
 
 *Note: you can alternatively find a mongodb hosting solution online and get the mongo URI from it without needing docker*
 
## 2. Create a .env file in the main project folder and paste and fill in the parameters with you **custom** data
```
  ACCESS_TOKEN_SECRET=
  ACCESS_TOKEN_LIFE=120
  REFRESH_TOKEN_SECRET=
  REFRESH_TOKEN_LIFE=86400

  PORT=3000

  MONGO_URI=mongodb://localhost:27017/vodbox

  ADMIN_PWD=
  USER_PWD= 
  ```
  
*Note: USE YOUR OWN INFORMATION*

## 3. Install Node Modules

```
npm install
```

## 4. Run the Bad Boy

```
npm start
```
