# Use nginx as the base image for serving static files
FROM nginx:alpine

# Copy the website files to nginx's hyttehits directory
COPY index.html /usr/share/nginx/hyttehits/
COPY styles.css /usr/share/nginx/hyttehits/
COPY game.js /usr/share/nginx/hyttehits/
COPY youtube.js /usr/share/nginx/hyttehits/
COPY README.md /usr/share/nginx/hyttehits/

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (nginx default)
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
