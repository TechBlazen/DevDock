FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bullseye

# Install additional tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    zsh \
    git \
    curl \
    vim \
    && apt-get autoremove -y && apt-get clean -y

# Install oh-my-zsh for better terminal experience
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

# Set zsh as default shell
ENV SHELL /bin/zsh

# Install global npm packages
RUN npm install -g pnpm yarn

# Configure git to trust the workspace
RUN git config --global --add safe.directory '*'

USER node
