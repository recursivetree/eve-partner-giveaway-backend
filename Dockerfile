FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# build for production
RUN npm ci --only=production

# include files
COPY src src

# open port
EXPOSE 80

# start node
CMD ["npm","run","start"]