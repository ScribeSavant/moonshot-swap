# Moonshot Simple Swap Script

This project demonstrates how to perform a basic swap on the Moonshot.

## Prerequisites
Before you begin, ensure you have the following:

- Node.js and [Bun](https://bun.sh) installed.
- An .env file with the necessary environment variables.
## Environment Variables
Create a `.env` file in the root directory of the project with the following content:
```
RPC_URL=<your_rpc_url>
PRIVATE_KEY=<your_private_key>
```
## Installation

```shell
git clone https://github.com/ScribeSavant/moonshot-swap
cd moonshot-swap
bun install
```

## Run
```shell
bun run index.ts
```

## Configuration
You can adjust the swap parameters in the `index.ts` file. Be sure to set the correct token addresses and amounts you want to swap.


## Disclaimer
Use this script at your own risk. Ensure that you have a thorough understanding of how blockchain transactions work and test with small amounts before using significant funds.

## License
This project is open-sourced under the MIT License.