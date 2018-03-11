
# base-image for node on any machine using a template variable,
# see more about dockerfile templates here: http://docs.resin.io/deployment/docker-templates/
# and about resin base images here: http://docs.resin.io/runtime/resin-base-images/
# Note the node:slim image doesn't have node-gyp
FROM resin/raspberry-pi-node:8

## uncomment if you want systemd
ENV INITSYSTEM on

# Add apt source of the foundation repository
# We need this source because bluez needs to be patched in order to work with rpi3 ( Issue #1314: How to get BT working on Pi3B. by clivem in raspberrypi/linux on GitHub )
# Add it on top so apt will pick up packages from there
#RUN sed -i '1s#^#deb http://archive.raspberrypi.org/debian jessie main\n#' /etc/apt/sources.list

# Install apt deps
RUN apt-get update && apt-get install -y \
  build-essential \
  connman \
  libdbus-1-dev \
  libglib2.0-dev \
  bluetooth \
  bluez \
  bluez-firmware \
  libbluetooth-dev \
  libudev-dev \
  && rm -rf /var/lib/apt/lists/*

# Disable connman - we will manually start it later
RUN systemctl disable connman

# Disable bluetooth service - we will manually start it later
RUN systemctl disable bluetooth

# Set npm
RUN npm config set unsafe-perm true

# Install PM2
RUN JOBS=MAX npm i pm2 -g

# Install PM2 log-rotate
RUN pm2 install pm2-logrotate && pm2 set pm2-logrotate:interval_unit 'DD' && pm2 set pm2-logrotate:retain 3

# Move package to filesystem
COPY ./package.json ./app/

# NPM i app
RUN JOBS=MAX npm i --prefix /app

# Move app to filesystem
COPY . ./app

# start connman
VOLUME /var/lib/connman

# expose the service
EXPOSE 3000

# Start app
CMD ["bash", "/app/start.sh"]