const { loadConfig } = require('./config');
const { formatShipmentUpdate } = require('./message');
const { fetchShipment, shipmentFingerprint } = require('./shiprocket');
const { createStateStore } = require('./stateStore');
const { shouldReplyToStatusRequest } = require('./statusRequest');
const { isTerminalShipment } = require('./terminalStatus');
const { createNotifier } = require('./whatsapp');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkShipment({ config, notifier, stateStore, forceSendCurrent = false }) {
  const shipment = await fetchShipment(config.trackingUrl);
  const fingerprint = shipmentFingerprint(shipment);
  const previousState = stateStore.read();
  const terminal = config.stopOnTerminalStatus
    ? isTerminalShipment(shipment, config.terminalStatuses)
    : false;
  const now = new Date().toISOString();

  if (forceSendCurrent) {
    await notifier.send(formatShipmentUpdate(shipment, null, { initial: true }));
    stateStore.write({
      fingerprint,
      shipment,
      firstSeenAt: previousState?.firstSeenAt || now,
      lastChangedAt: previousState?.lastChangedAt || now,
      lastCheckedAt: now,
      terminal
    });
    console.log(`Current shipment status sent. Status="${shipment.status}".`);
    if (terminal) {
      console.log(`Terminal shipment status reached: ${shipment.status}. Stopping bot.`);
    }
    return { terminal };
  }

  if (!previousState) {
    if (config.sendInitialUpdate) {
      await notifier.send(formatShipmentUpdate(shipment, null, { initial: true }));
    } else {
      console.log('Initial shipment state recorded. No message sent.');
    }

    stateStore.write({
      fingerprint,
      shipment,
      firstSeenAt: now,
      lastChangedAt: now,
      lastCheckedAt: now,
      terminal
    });
    if (terminal) {
      console.log(`Terminal shipment status reached: ${shipment.status}. Stopping bot.`);
    }
    return { terminal };
  }

  if (previousState.fingerprint !== fingerprint) {
    await notifier.send(formatShipmentUpdate(shipment, previousState));
    stateStore.write({
      fingerprint,
      shipment,
      firstSeenAt: previousState.firstSeenAt || now,
      lastChangedAt: now,
      lastCheckedAt: now,
      terminal
    });
    if (terminal) {
      console.log(`Terminal shipment status reached: ${shipment.status}. Stopping bot.`);
    }
    return { terminal };
  }

  stateStore.write({
    ...previousState,
    shipment,
    lastCheckedAt: now,
    terminal
  });
  console.log(
    `No change. Status="${shipment.status}", latest="${shipment.latestActivity?.activity || 'none'}".`
  );
  if (terminal) {
    console.log(`Terminal shipment status reached: ${shipment.status}. Stopping bot.`);
  }
  return { terminal };
}

async function main() {
  const config = loadConfig();
  const stateStore = createStateStore(config.stateFile);
  const notifier = createNotifier(config);
  const once = process.argv.includes('--once');
  const sendCurrent = process.argv.includes('--send-current');
  let stopRequested = false;

  console.log(`Tracking ${config.trackingUrl}`);
  console.log(`Mode: ${config.mode}`);

  try {
    await notifier.start();

    if (!once && !sendCurrent && config.replyToGroupStatusRequests) {
      await notifier.onStatusRequest(
        async () => {
          const result = await checkShipment({
            config,
            notifier,
            stateStore,
            forceSendCurrent: true
          });
          if (result?.terminal) {
            stopRequested = true;
          }
        },
        {
          cooldownMs: config.statusRequestCooldownMs,
          matches: (text) => shouldReplyToStatusRequest(text, config.statusRequestPhrases)
        }
      );
    }

    if (once || sendCurrent) {
      await checkShipment({
        config,
        notifier,
        stateStore,
        forceSendCurrent: sendCurrent
      });
      return;
    }

    while (true) {
      if (stopRequested) {
        return;
      }

      try {
        const result = await checkShipment({ config, notifier, stateStore });
        if (result?.terminal) {
          return;
        }
      } catch (error) {
        console.error('Shipment check failed:', error.message);
      }

      await sleep(config.pollIntervalMs);
    }
  } finally {
    await notifier.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
