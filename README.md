# Prompt users for input

This project is a bot to reduce support in VP Team

## Prerequisites

- Node.js version 10.14.1 or higher.

    ```bash
    # determine node version
    node --version
    ```

## To try this sample

- Clone the repository

    ```bash
    git clone https://gitlab.vpg.tech/red-squad/support-bot.git
    ```

- Install modules

    ```bash
    npm install
    ```

- Run the project

    ```bash
    npm start
    ```

- You can run with watch

    ```bash
    npm run watch
    ```

## Testing the bot using Bot Framework Emulator

[Bot Framework Emulator](https://github.com/microsoft/botframework-emulator) is a desktop application that allows bot developers to test and debug their bots on localhost or running remotely through a tunnel.

- Install the latest Bot Framework Emulator from [here](https://github.com/Microsoft/BotFramework-Emulator/releases)

### Connect to the bot using Bot Framework Emulator

- Launch Bot Framework Emulator
- File -> Open Bot
- Enter a Bot URL of `http://localhost:3978/api/messages`
