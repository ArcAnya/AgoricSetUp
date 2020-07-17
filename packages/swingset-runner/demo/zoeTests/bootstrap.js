/* global harden */

import { E } from '@agoric/eventual-send';
import produceIssuer from '@agoric/ertp';
import buildManualTimer from './manualTimer';
import { makePrintLog } from './printLog';

/* eslint-disable import/no-unresolved, import/extensions */
import automaticRefundBundle from './bundle-automaticRefund';
import coveredCallBundle from './bundle-coveredCall';
import publicAuctionBundle from './bundle-publicAuction';
import atomicSwapBundle from './bundle-atomicSwap';
import simpleExchangeBundle from './bundle-simpleExchange';
import autoswapBundle from './bundle-autoswap';
import sellItemsBundle from './bundle-sellItems';
import mintAndSellNFTBundle from './bundle-mintAndSellNFT';
/* eslint-enable import/no-unresolved, import/extensions */

const log = makePrintLog();

const setupBasicMints = () => {
  const all = [
    produceIssuer('moola'),
    produceIssuer('simoleans'),
    produceIssuer('bucks'),
  ];
  const mints = all.map(objs => objs.mint);
  const issuers = all.map(objs => objs.issuer);
  const amountMaths = all.map(objs => objs.amountMath);

  return harden({
    mints,
    issuers,
    amountMaths,
  });
};

const makeVats = (vats, zoe, installations, startingExtents) => {
  const timer = buildManualTimer(log);
  const { mints, issuers, amountMaths } = setupBasicMints();
  const makePayments = extents =>
    mints.map((mint, i) => mint.mintPayment(amountMaths[i].make(extents[i])));
  const [aliceExtents, bobExtents, carolExtents, daveExtents] = startingExtents;

  // Setup Alice
  const aliceP = E(vats.alice).build(
    zoe,
    issuers,
    makePayments(aliceExtents),
    installations,
    timer,
  );

  // Setup Bob
  const bobP = E(vats.bob).build(
    zoe,
    issuers,
    makePayments(bobExtents),
    installations,
    timer,
  );

  const result = {
    aliceP,
    bobP,
  };

  if (carolExtents) {
    const carolP = E(vats.carol).build(
      zoe,
      issuers,
      makePayments(carolExtents),
      installations,
      timer,
    );
    result.carolP = carolP;
  }

  if (daveExtents) {
    const daveP = E(vats.dave).build(
      zoe,
      issuers,
      makePayments(daveExtents),
      installations,
      timer,
    );
    result.daveP = daveP;
  }

  log(`=> alice, bob, carol and dave are set up`);
  return harden(result);
};

export function buildRootObject(_vatPowers) {
  const obj0 = {
    async bootstrap(argv, vats) {
      const zoe = await E(vats.zoe).getZoe();

      const installations = {
        automaticRefund: await E(zoe).install(automaticRefundBundle),
        coveredCall: await E(zoe).install(coveredCallBundle),
        publicAuction: await E(zoe).install(publicAuctionBundle),
        atomicSwap: await E(zoe).install(atomicSwapBundle),
        simpleExchange: await E(zoe).install(simpleExchangeBundle),
        autoswap: await E(zoe).install(autoswapBundle),
        sellItems: await E(zoe).install(sellItemsBundle),
        mintAndSellNFT: await E(zoe).install(mintAndSellNFTBundle),
      };

      // automaticRefundOk '[[3,0,0],[0,17,0]]'
      // coveredCallOk '[[3,0,0],[0,7,0]]'
      // swapForOptionOk '[[3,0,0],[0,0,0],[0,0,0],[0,7,1]]'
      // publicAuctionOk '[[1,0,0],[0,11,0],[0,7,0],[0,5,0]]'
      // atomicSwapOk '[[3,0,0],[0,7,0]]'
      // simpleExchangeOk '[[3,0,0],[0,7,0]]'
      // simpleExchangeNotifier '[[3,0,0],[0,24,0]]'
      // autoswapOk '[[10,5,0],[3,7,0]]'
      // sellTicketsOk '[[0,0,0],[22,0,0]]'

      const [testName, startingExtentsStr] = argv;
      const startingExtents = JSON.parse(startingExtentsStr);

      const { aliceP, bobP, carolP, daveP } = makeVats(
        vats,
        zoe,
        installations,
        startingExtents,
      );
      await E(aliceP).startTest(testName, bobP, carolP, daveP);
    },
  };
  return harden(obj0);
}