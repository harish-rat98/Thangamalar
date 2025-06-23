# Thanga Malar Jewellery Management System - Deployment Guide

## Local Development Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Git

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jewelry-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   - Create a PostgreSQL database
   - Set environment variables:
     ```bash
     export DATABASE_URL="postgresql://username:password@localhost:5432/jewelry_db"
     export SESSION_SECRET="your-session-secret-key"
     export REPL_ID="your-replit-id"
     export REPLIT_DOMAINS="localhost:5000"
     export ISSUER_URL="https://replit.com/oidc"
     ```

4. **Initialize Database**
   ```bash
   npm run db:push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## Production Deployment

### Option 1: Replit Deployment (Recommended)
- Already configured for Replit
- Click "Deploy" button in Replit interface
- Automatic SSL, domain, and health checks
- Available at `your-repl-name.replit.app`

### Option 2: VPS/Cloud Server

1. **Server Requirements**
   - Ubuntu 20.04+ or similar
   - 2GB RAM minimum
   - Node.js 18+
   - PostgreSQL 12+
   - Nginx (for reverse proxy)

2. **Server Setup**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PostgreSQL
   sudo apt install postgresql postgresql-contrib
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

3. **Database Setup**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE jewelry_management;
   CREATE USER jewelry_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE jewelry_management TO jewelry_user;
   \q
   ```

4. **Application Deployment**
   ```bash
   # Clone and setup
   git clone <your-repo> /var/www/jewelry-management
   cd /var/www/jewelry-management
   npm install --production
   
   # Environment configuration
   sudo nano .env
   ```

   Add to `.env`:
   ```
   DATABASE_URL=postgresql://jewelry_user:secure_password@localhost:5432/jewelry_management
   SESSION_SECRET=your-very-secure-session-secret
   NODE_ENV=production
   PORT=3000
   ```

5. **Initialize Database**
   ```bash
   npm run db:push
   ```

6. **Start with PM2**
   ```bash
   pm2 start npm --name "jewelry-management" -- run dev
   pm2 save
   pm2 startup
   ```

7. **Nginx Configuration**
   ```bash
   sudo nano /etc/nginx/sites-available/jewelry-management
   ```

   Add configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/jewelry-management /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

8. **SSL Certificate (Optional)**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Option 3: Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 5000
   CMD ["npm", "run", "dev"]
   ```

2. **Docker Compose**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "5000:5000"
       environment:
         - DATABASE_URL=postgresql://postgres:password@db:5432/jewelry
         - SESSION_SECRET=your-secret
       depends_on:
         - db
     
     db:
       image: postgres:15
       environment:
         - POSTGRES_DB=jewelry
         - POSTGRES_PASSWORD=password
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

## Environment Variables

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret key for sessions
- `NODE_ENV`: production/development
- `PORT`: Application port (default: 5000)

Optional for authentication:
- `REPL_ID`: For Replit authentication
- `REPLIT_DOMAINS`: Allowed domains
- `ISSUER_URL`: Authentication issuer

## Database Backup

```bash
# Backup
pg_dump jewelry_management > backup_$(date +%Y%m%d).sql

# Restore
psql jewelry_management < backup_20240101.sql
```

## Monitoring

- Check application logs: `pm2 logs jewelry-management`
- Monitor processes: `pm2 monit`
- Database monitoring: `sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"`

## Security Considerations

1. **Database Security**
   - Use strong passwords
   - Limit database connections
   - Regular backups

2. **Application Security**
   - Keep dependencies updated: `npm audit fix`
   - Use HTTPS in production
   - Secure session secrets

3. **Server Security**
   - Regular system updates
   - Firewall configuration
   - SSH key authentication

## Troubleshooting

- **Database connection issues**: Check DATABASE_URL and PostgreSQL service
- **Authentication problems**: Verify REPL_ID and session configuration
- **Port conflicts**: Change PORT environment variable
- **Memory issues**: Increase server RAM or optimize queries

For support, check application logs and verify all environment variables are set correctly.