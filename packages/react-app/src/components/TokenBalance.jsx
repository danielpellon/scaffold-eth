import { useTokenBalance } from "eth-hooks";
import React, { useState } from "react";

import { utils } from "ethers";

export default function TokenBalance(props) {
  const [dollarMode, setDollarMode] = useState(true);

  const tokenContract = props.contracts && props.contracts[props.name];
  const balance = useTokenBalance(tokenContract, props.address, 1777);

  let floatBalance = parseFloat("0.00");

  let usingBalance = balance;
  let fontSize=16;
  if (props.fontSize) {
    fontSize=props.fontSize;
  }

  if (typeof props.balance !== "undefined") {
    usingBalance = props.balance;
  }

  if (usingBalance) {
    const etherBalance = utils.formatEther(usingBalance);
    parseFloat(etherBalance).toFixed(2);
    floatBalance = parseFloat(etherBalance);
  }

  let displayBalance = floatBalance.toFixed(4);

  if (props.dollarMultiplier && dollarMode) {
    displayBalance = "$" + (floatBalance * props.dollarMultiplier).toFixed(2);
  }

  return (
    <span
      style={{
        verticalAlign: "middle",
        fontSize,
        padding: 8,
        cursor: "pointer",
      }}
      onClick={() => {
        setDollarMode(!dollarMode);
      }}
    >
      {props.img} {displayBalance}
    </span>
  );
}
