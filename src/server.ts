import 'dotenv/config';
import { loadConfig } from './config';
import { buildContainer } from './container';

async function main(): Promise<void> {
  const config = loadConfig();
  const { app, logger, close } = await buildContainer(config);

  const server = app.listen(config.port, config.host, () => {
    logger.info({ host: config.host, port: config.port }, 'Server listening');
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    server.close(async () => {
      await close();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
