# latude hub

Express API build on nodejs that is listening to the ethereum blockchain to be the source of truth and provide online travel agencies application to query properties, assets and availabilities within the lature network.

### How to Contribute

Any contributions are welcome!

### Get & Build

```
git clone https://github.com/lerer00/latude-hub.git
npm install
```

### Prerequisites

- CosmosDb emulator, this is our main georeferenced datastorage.
- Azure storage emulator, this is where images are stored. 

To run an instance locally you'll need deploy latude contracts on a local ethereum network. The easiest way is to start the [latude-owner-portal](https://github.com/lerer00/latude-owner-portal) project.

### Developing locally

Deploy latude contracts and run this command.

```
npm run dev
```
