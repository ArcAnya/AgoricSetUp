/* global harden */

export default function setup(syscall, state, helpers, _vatPowers) {
  let deviceRef;
  const dispatch = harden({
    deliver(facetid, method, args, _result) {
      if (method === 'bootstrap') {
        const argb = JSON.parse(args.body);
        const deviceIndex = argb[2].d1.index;
        deviceRef = args.slots[deviceIndex];
        if (deviceRef !== 'd-70') {
          throw new Error(`bad deviceRef ${deviceRef}`);
        }
      } else if (method === 'step1') {
        console.log('in step1');
        helpers.testLog(`callNow`);
        const setArgs = harden({ body: JSON.stringify([]), slots: [] });
        const ret = syscall.callNow(deviceRef, 'set', setArgs);
        helpers.testLog(JSON.stringify(ret));
      }
    },
  });
  return dispatch;
}
