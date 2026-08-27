$prodDir = "C:\Users\7ALAZOUN\Desktop\fripestorekef\production"

# Create production directory
if (Test-Path $prodDir) {
    Remove-Item -Recurse -Force $prodDir
}
New-Item -ItemType Directory -Path $prodDir

# Copy backend
New-Item -ItemType Directory -Path "$prodDir\back"
Copy-Item -Recurse -Path "C:\Users\7ALAZOUN\Desktop\fripestorekef\local\back\*" -Destination "$prodDir\back" -Exclude "node_modules"

# Copy frontend
New-Item -ItemType Directory -Path "$prodDir\fr"
Copy-Item -Recurse -Path "C:\Users\7ALAZOUN\Desktop\fripestorekef\local\fr\*" -Destination "$prodDir\fr" -Exclude "node_modules", ".next", "out"

# Copy database if exists
if (Test-Path "C:\Users\7ALAZOUN\Desktop\fripestorekef\local\offline_pos.db") {
    Copy-Item -Path "C:\Users\7ALAZOUN\Desktop\fripestorekef\local\offline_pos.db" -Destination "$prodDir\offline_pos.db"
}

# 1. Create docker-compose.yml
$dockerCompose = @"
version: '3.8'

services:
  backend:
    build:
      context: ./back
      dockerfile: Dockerfile
    container_name: pos_backend
    ports:
      - "4000:4000"
    volumes:
      - ./offline_pos.db:/app/offline_pos.db
    # Note: USB devices need to be passed through depending on the host OS.
    # On Linux, you can uncomment the following:
    # devices:
    #   - "/dev/usb/lp0:/dev/usb/lp0"
    restart: unless-stopped

  frontend:
    build:
      context: ./fr
      dockerfile: Dockerfile
    container_name: pos_frontend
    ports:
      - "3000:3000"
    restart: unless-stopped
    depends_on:
      - backend
"@
Set-Content -Path "$prodDir\docker-compose.yml" -Value $dockerCompose -Encoding UTF8

# 2. Create Backend Dockerfile
$backendDockerfile = @"
FROM node:18-alpine

# Install build dependencies for native modules (serialport, usb, sqlite3)
RUN apk add --no-cache python3 make g++ linux-headers udev

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 4000
CMD ["npm", "start"]
"@
Set-Content -Path "$prodDir\back\Dockerfile" -Value $backendDockerfile -Encoding UTF8

# 3. Create Frontend Dockerfile (Static Export served by Nginx)
$frontendDockerfile = @"
# Stage 1: Build the static files
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Build the export output (out directory)
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

COPY --from=builder /app/out /usr/share/nginx/html
# Use custom nginx config to handle Next.js routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
"@
Set-Content -Path "$prodDir\fr\Dockerfile" -Value $frontendDockerfile -Encoding UTF8

# 4. Create Frontend Nginx config
$nginxConf = @"
server {
    listen 3000;
    
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files `$uri `$uri.html `$uri/ /index.html;
    }
}
"@
Set-Content -Path "$prodDir\fr\nginx.conf" -Value $nginxConf -Encoding UTF8

# 5. Create README.md
$readme = @"
# POS System - Production Setup

This folder contains everything needed to run the POS system on another laptop using Docker.

## Prerequisites
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop).
2. Open a terminal in this folder.

## How to run
Run the following command to build and start the system:
\`\`\`bash
docker-compose up -d --build
\`\`\`

## Accessing the app
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000

## Hardware Notice (Printers / Cash Drawers)
If you are running Docker on **Windows** or **Mac**, accessing local USB printers or Serial ports from inside the Docker container is restricted by Docker Desktop.
If you rely on direct USB/Serial connection for your cash drawer, you may need to:
1. Share the printer over the network (Network Printer) and use the IP address.
2. OR Run the backend natively with \`npm install\` and \`npm start\` on Windows, instead of using Docker for the backend.
"@
Set-Content -Path "$prodDir\README.md" -Value $readme -Encoding UTF8

Write-Host "Production folder successfully created at $prodDir"
