<script>
  import { E } from "@agoric/eventual-send";
  import TextField from 'smelte/src/components/TextField';
  import Chip from '../lib/Chip.svelte';
  import Request from './Request.svelte';
  
  export let item;
  export let dismiss;

  $: ({ enable, actions, suggestedPetname,
    petname: origPetname, dappOrigin, origin } = item);
  let petname = item.petname || item.suggestedPetname;

  const enableDapp = () => {
    E(E(actions).setPetname(petname)).enable();
  }

  const keydown = ev => {
    if (ev.key === 'Escape') {
      petname = origPetname;
      ev.stopPropagation();
    } else if (ev.key === 'Enter') {
      E(actions).setPetname(petname);
      ev.stopPropagation();
    }
  };
</script>

<style>
  .enable {
    float: right;
  }

  .petname {
    font-weight: 700;
  }
  
  .blue {
    color: rgb(0, 176, 255);
  }
</style>

<Request dismiss={dismiss} completed={enable}>
  <span slot="header">
    Incoming Dapp Connection
  </span>
  <span class="petname">
    {origPetname}
  </span>
  <div>
    {#if enable}
    User interface: <a target="_blank" href={dappOrigin || origin}>{dappOrigin || origin}</a>
    {:else}
    Alleged user interface: <strikethrough class="blue">{dappOrigin || origin}</strikethrough>
    {/if}
  </div>
  {#if !enable}
    <div on:keydown|capture={keydown}><TextField
      hint="Alleged name: {JSON.stringify(suggestedPetname)}"
      label="Dapp petname"
      bind:value={petname}
    /></div>
  {/if}
  <div class="enable">
    {#if enable}
      <Chip selected color="success">
        Enabled
      </Chip>
    {:else}
      <Chip on:click={enableDapp} icon="check" selected color="success">
        Enable
      </Chip>
    {/if}
  </div>
</Request>
