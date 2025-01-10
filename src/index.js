'use strict'

// main entry point
const
    constants = require('./constants'),
    grpc = require('@grpc/grpc-js'),
    mock = require('./mock'),
    logging = require('./helpers/logging'),
    log = logging.logger(),
    net = require('net');


const main = () => {
    if (!process.argv[2]) {
        console.error('Error: No configuration provided.');
        process.exit(1);
    }

    let config;
    try {
        config = JSON.parse(process.argv[2]);
    } catch (e) {
        console.error('Error: Invalid JSON configuration.');
        process.exit(1);
    }

    const placeholder = net.createServer((sock) => { sock.end('placeholder'); });

    logging.setLogLevel(config.loglevel || constants.LOGGING.INFO.LEVEL);

    // use placeholder server to bind port, then close -> start gRPC server with same port
    placeholder.listen(config.port || 0, () => {
        const port = placeholder.address().port;
        placeholder.close(() => {
            const serverInstance = mock.getServerInstance(Object.assign(config, {'port': port}));
            serverInstance.bindAsync(
                `0.0.0.0:${port}`,
                grpc.ServerCredentials.createInsecure()
            );
            serverInstance.start();
            let metadata = {
                'port': port,
                'encoding': 'utf8',
                'services': config.services
            }
            console.log(JSON.stringify(metadata));
            log.info(`server started on port '%s'`, port);
        });
    });
}

main();
