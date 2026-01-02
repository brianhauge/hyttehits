# Use nginx as the base image for serving static files
FROM nginx:alpine

# Copy the website files to nginx's default html directory
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY game.js /usr/share/nginx/html/
COPY youtube.js /usr/share/nginx/html/
COPY README.md /usr/share/nginx/html/

# Expose port 80 (nginx default)
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
