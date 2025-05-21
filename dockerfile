FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

COPY . .




EXPOSE 80

CMD ["npm", "run", "dev"]
