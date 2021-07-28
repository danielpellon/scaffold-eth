import React from "react";
import { SuperFluidComponent } from "../components";


export default function SuperFluidView(
    {
      address,
      injectedProvider,
      localProvider,
      price,
      selectedChainId,
      mainnetProvider,
    }) {
  return (
    <SuperFluidComponent
      address={address}
      injectedProvider={injectedProvider}
      localProvider={localProvider}
      price={price}
      selectedChainId={selectedChainId}
      mainnetProvider={mainnetProvider}
      />
  );
};
