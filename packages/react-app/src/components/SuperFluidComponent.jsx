import React, { useEffect, useState } from "react";
import SuperfluidSDK from "@superfluid-finance/js-sdk";
import { Button, Divider, Input, Form, InputNumber } from "antd";

import { Address, Balance } from "../components";

import { useContractReader, useContractLoader, useUserSigner } from "../hooks"

// 0xb64845d53a373d35160b72492818f0d2f51292c0 kovan fDAI
// 0xe3cb950cb164a31c66e32c320a800d477019dcff kovan fDAIx
// 0xF2d68898557cCb2Cf4C10c3Ef2B034b2a69DAD00 goerli fDAI

const kovanChainID = 42; // TODO: use selected chainid
const fDAIAddress = '0xb64845d53a373d35160b72492818f0d2f51292c0';
const fDAIxAddress = "0xe3cb950cb164a31c66e32c320a800d477019dcff";

function CashflowDiplayer({
  sfUserDetails,
  name
}) {
  if(sfUserDetails && sfUserDetails.hasOwnProperty("cfa") && sfUserDetails.cfa.hasOwnProperty("flows")) {
    const template=[]
    
    // generate inflow and outflow display templates
      const flowTypes = ["inFlows", "outFlows"];
      
      for(const flowType of flowTypes) {
        const flows = sfUserDetails.cfa.flows[flowType];
        template.push(
          <div>
            <h3>{name} {flowType}</h3>
          </div>
        );

        if (flows && flows.length) {
          for (const flow of flows) {
            template.push(
              <div key={flowType+name}>
                <h4>Sender</h4>
                <Address address={flow.sender} fontSize={16}/>
                <h4>Receiver</h4>
                <Address address={flow.receiver} fontSize={16}/>
                <h4>Flow Rate</h4>
                {flow.flowRate}
              </div>
            )
          }
        } else {
          template.push(<p>No {flowType}</p>)
        }
        template.push(<Divider />);
      }

      template.push(
        <div>
          <h3>{name} netflow</h3>
          {sfUserDetails.cfa.netFlow}
          <Divider />
        </div>
        
      )
    return template
  } else return <h1>...</h1>;
}


function RecipientForm({onRecipientSubmit, onRecipientFailed}) {
  return (
    <Form
      name="basic"
      layout="vertical"
      // wrapperCol={{ span: 16 }}
      onFinish={onRecipientSubmit}
      onFinishFailed={onRecipientFailed}
      requiredMark={false}>
    <Form.Item
      label="Name"
      name="name"
      rules={[{ required: true }]}
    >
      <Input />
    </Form.Item>

    <Form.Item
      label="Address"
      name="address"
      rules={[{ required: true, message: 'Please input the receipients address' }]}
    >
      <Input />
    </Form.Item>


    <Form.Item >
      <Button type="primary" htmlType="submit">
        Create new recipient
      </Button>
    </Form.Item>
  </Form>
  )
}

function FlowForm({
  onFlowSubmit,
  onFlowFailed
}) {
  return (
      <Form

        layout="inline"
        onFinish={onFlowSubmit}
        onFinishFailed={onFlowFailed}
        requiredMark={false}
      >
        <Form.Item
          label="Flowrate"
          name="flowRate"
        >
          <InputNumber
            name="flowRate"
          />
        </Form.Item>

        <Form.Item >
          <Button type="primary" htmlType="submit">
            Create new flow
          </Button>
        </Form.Item>
      </Form>
  )
}

// Retrieves and displays fDAI and fDAIx token balances
function BalanceDisplayer({
  address,
  name,
  contracts
}) {
  
  if(!address){
    return <h1>...</h1>
  }
  
  // Read user fDAI balance
  const fDAI = useContractReader(contracts, "fDAI", "balanceOf", [
    address,
  ]);

  // Read user fDAIx balance
  const fDAIx = useContractReader(contracts, "fDAIx", "balanceOf", [
    address,
  ]);

 
return(
  <div>
    <h2>{name} balances</h2>
    <h3>fDAI: </h3>
    <Balance balance={fDAI} fontSize={12} />

    <h3>fDAIx: </h3>
    <Balance balance={fDAIx} fontSize={12} />
  </div>
  )
}


// TODO: need to do free up some objects when using await 
export default function SuperFluidComponent(
  {
    address,
    localProvider,
    injectedProvider,
    selectedChainId
  }) {

  const [sfSDK, setSfSDK] = useState();
  const [sfUser, setSfUser] = useState();
  const [sfUserDetails, setSfUserDetails] = useState({});
  const [recipient, setRecipient] = useState();
  const [sfRecipientDetails, setSfRecipientDetails] = useState();




  // scaffold-eth hooks
  // get user provider
  const userProvider = useUserSigner(injectedProvider, localProvider);
  // load fToken contracts, look at external_contracts.js
  const contracts = useContractLoader(userProvider)//, {chainId: selectedChainId});

   // Initialize Superfluid SDK, runs once on component initialization
   useEffect(async () => {
    if (userProvider) {
      const sf = new SuperfluidSDK.Framework({
        ethers: userProvider.provider,
        // ethers: new Web3Provider(window.ethereum),
        tokens: ["fDAI", "fDAIx"],
      })
      await sf.initialize();
      console.log("💧 Superfluid SDK: ", sf);
      setSfSDK(sf);
    }
  }, []);
 
  // watch for sdk or new recipient changes
  useEffect(async () => {
    if (sfSDK) {
      const user = sfSDK.user({
        address: address,
        token: fDAIxAddress
      });
      setSfUser(user);

      // TODO: no monkey patching
      const details = await user.details();

      setSfUserDetails(details);
    }

    if (sfSDK && recipient && recipient["address"]) {
      const newUser = sfSDK.user({
        address: recipient.address,
        token: fDAIxAddress
      });

      // TODO: no monkey patching
      const details = await newUser.details();
      setSfRecipientDetails(details);

    }
  }, [recipient, sfSDK]);



  const onRecipientSubmit = (values) => {
    setRecipient(values);
  };

  const onRecipientFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  const onFlowSubmit = async (values) => {
    const flowRate = values.flowRate || 0;
    console.log(flowRate)
    console.log(recipient.address);
    await sfUser.flow({
      recipient: recipient.address,
      flowRate
    })
    const details = await sfUser.details();
  // TODO: update parent state with nnew cashflows      
    console.log('Success:', values);
  };

  const onFlowFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };
  

  const template=[];
  template.push(
    <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, margin: "auto", marginTop: 64 }}>
      <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMTY3cHgiIGhlaWdodD0iNDBweCIgdmlld0JveD0iMCAwIDE2NyA0MCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj4KICAgIDx0aXRsZT5Mb2dvL0Z1bGwvTGlnaHQ8L3RpdGxlPgogICAgPGcgaWQ9IldlYnNpdGUtRGVza3RvcC0iIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSJNYWluLVBhZ2UiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0xMzAuMDAwMDAwLCAtNjIuMDAwMDAwKSIgZmlsbD0iIzEyMTQxRSI+CiAgICAgICAgICAgIDxnIGlkPSJMb2dvL0Z1bGwvRGFyayIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTMwLjAwMDAwMCwgNjIuMDAwMDAwKSI+CiAgICAgICAgICAgICAgICA8ZyBpZD0iTG9nbyI+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTYyLjQxNSwyMi4wNjYxMTExIEw2Mi40MTUsMTQuNDI0MTY2NyBMNjYuMTM5NzIyMiwxNC40MjQxNjY3IEw2Ni4xMzk3MjIyLDIyLjM3IEM2Ni4xMzk3MjIyLDIzLjE2MTExMTEgNjYuMzgzMDU1NiwyMy43OTUyNzc4IDY2Ljg3MDI3NzgsMjQuMjczNjExMSBDNjcuMzU3Nzc3OCwyNC43NTE2NjY3IDY3Ljk3ODYxMTEsMjQuOTkxMTExMSA2OC43MzI3Nzc4LDI0Ljk5MTExMTEgQzY5LjQ2ODA1NTYsMjQuOTkxMTExMSA3MC4wNzUyNzc4LDI0Ljc0Njk0NDQgNzAuNTUzNjExMSwyNC4yNTk3MjIyIEM3MS4wMzE2NjY3LDIzLjc3MjUgNzEuMjcwODMzMywyMy4xNDIyMjIyIDcxLjI3MDgzMzMsMjIuMzcgTDcxLjI3MDgzMzMsMTQuNDI0MTY2NyBMNzQuOTk1Mjc3OCwxNC40MjQxNjY3IEw3NC45OTUyNzc4LDIyLjA2NjExMTEgQzc0Ljk5NTI3NzgsMjMuOTQyMjIyMiA3NC40MDE5NDQ0LDI1LjQ2OTE2NjcgNzMuMjE1ODMzMywyNi42NDU4MzMzIEM3Mi4wMjk0NDQ0LDI3LjgyMzMzMzMgNzAuNTM1Mjc3OCwyOC40MTE2NjY3IDY4LjczMjc3NzgsMjguNDExNjY2NyBDNjYuODkzMzMzMywyOC40MTE2NjY3IDY1LjM4MTExMTEsMjcuODI3Nzc3OCA2NC4xOTQ3MjIyLDI2LjY1OTQ0NDQgQzYzLjAwODA1NTYsMjUuNDkxNjY2NyA2Mi40MTUsMjMuOTYwODMzMyA2Mi40MTUsMjIuMDY2MTExMSIgaWQ9IkZpbGwtMSI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik04Ny4zMjM4ODg5LDIxLjI2NjM4ODkgQzg3LjMyMzg4ODksMjAuMTQ0NzIyMiA4Ni45OTMzMzMzLDE5LjIzNDQ0NDQgODYuMzMwODMzMywxOC41MzQ3MjIyIEM4NS42NjkxNjY3LDE3LjgzNjY2NjcgODQuODIyNSwxNy40ODY5NDQ0IDgzLjc5MzA1NTYsMTcuNDg2OTQ0NCBDODIuOCwxNy40ODY5NDQ0IDgxLjk3NjM4ODksMTcuODE4MDU1NiA4MS4zMjM4ODg5LDE4LjQ4IEM4MC42NzA1NTU2LDE5LjE0MjIyMjIgODAuMzQ0NDQ0NCwyMC4wNjE2NjY3IDgwLjM0NDQ0NDQsMjEuMjM4ODg4OSBDODAuMzQ0NDQ0NCwyMi40MTYxMTExIDgwLjY3MDU1NTYsMjMuMzQwMjc3OCA4MS4zMjM4ODg5LDI0LjAxMDgzMzMgQzgxLjk3NjM4ODksMjQuNjgzMDU1NiA4Mi44LDI1LjAxODMzMzMgODMuNzkzMDU1NiwyNS4wMTgzMzMzIEM4NC44MDQxNjY3LDI1LjAxODMzMzMgODUuNjQ1ODMzMywyNC42NjkxNjY3IDg2LjMxNzIyMjIsMjMuOTY5NzIyMiBDODYuOTg4NjExMSwyMy4yNzA4MzMzIDg3LjMyMzg4ODksMjIuMzcgODcuMzIzODg4OSwyMS4yNjYzODg5IFogTTg5LjIxMzYxMTEsMTYuMTQ4ODg4OSBDOTAuNDczMzMzMywxNy41MDA1NTU2IDkxLjEwMzYxMTEsMTkuMTk3MjIyMiA5MS4xMDM2MTExLDIxLjIzODg4ODkgQzkxLjEwMzYxMTEsMjMuMjgwMjc3OCA5MC40NzMzMzMzLDI0Ljk4NjExMTEgODkuMjEzNjExMSwyNi4zNTYzODg5IEM4Ny45NTQxNjY3LDI3LjcyNjM4ODkgODYuMzc2OTQ0NCwyOC40MTE2NjY3IDg0LjQ4MjUsMjguNDExNjY2NyBDODIuNzcxOTQ0NCwyOC40MTE2NjY3IDgxLjQxMDgzMzMsMjcuODYgODAuMzk5NDQ0NCwyNi43NTYzODg5IEw4MC4zOTk0NDQ0LDMzLjA0NjExMTEgTDc2LjY3NTI3NzgsMzMuMDQ2MTExMSBMNzYuNjc1Mjc3OCwxNC40MjQxNjY3IEw4MC4wOTYxMTExLDE0LjQyNDE2NjcgTDgwLjA5NjExMTEsMTYuMTM1Mjc3OCBDODEuMDM0MTY2NywxNC43OTI1IDgyLjQ5NjExMTEsMTQuMTIxMTExMSA4NC40ODI1LDE0LjEyMTExMTEgQzg2LjM3Njk0NDQsMTQuMTIxMTExMSA4Ny45NTQxNjY3LDE0Ljc5NjY2NjcgODkuMjEzNjExMSwxNi4xNDg4ODg5IEw4OS4yMTM2MTExLDE2LjE0ODg4ODkgWiIgaWQ9IkZpbGwtMiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik05Ni4yMDUyNzc4LDE5Ljg4NjY2NjcgTDEwMi40MTI3NzgsMTkuODg2NjY2NyBDMTAyLjM5NDE2NywxOS4wNTkxNjY3IDEwMi4xMDQxNjcsMTguMzkyNSAxMDEuNTQzMzMzLDE3Ljg4NjY2NjcgQzEwMC45ODE5NDQsMTcuMzgxMTExMSAxMDAuMjg3Nzc4LDE3LjEyODMzMzMgOTkuNDYwNTU1NiwxNy4xMjgzMzMzIEM5OC42Njk3MjIyLDE3LjEyODMzMzMgOTcuOTc5NzIyMiwxNy4zNzYzODg5IDk3LjM5MTM4ODksMTcuODczMDU1NiBDOTYuODAyNSwxOC4zNjkxNjY3IDk2LjQwNzIyMjIsMTkuMDQxMTExMSA5Ni4yMDUyNzc4LDE5Ljg4NjY2NjcgWiBNMTA1Ljc3Nzc3OCwyMi41MDc1IEw5Ni4yMDUyNzc4LDIyLjUwNzUgQzk2LjQyNTgzMzMsMjMuMzcyNSA5Ni44NzExMTExLDI0LjAzOTE2NjcgOTcuNTQzMDU1NiwyNC41MDc3Nzc4IEM5OC4yMTM4ODg5LDI0Ljk3NzIyMjIgOTkuMDQ2NjY2NywyNS4yMTE2NjY3IDEwMC4wNCwyNS4yMTE2NjY3IEMxMDEuMzgxOTQ0LDI1LjIxMTY2NjcgMTAyLjY1MTExMSwyNC43NTE2NjY3IDEwMy44NDY5NDQsMjMuODMxNjY2NyBMMTA1LjM5MTY2NywyNi4zNzAyNzc4IEMxMDMuNzU1LDI3LjczMTM4ODkgMTAxLjkzMzg4OSwyOC40MTE2NjY3IDk5LjkyOTE2NjcsMjguNDExNjY2NyBDOTcuODMyNSwyOC40NDgwNTU2IDk2LjA1MzMzMzMsMjcuNzYzMDU1NiA5NC41OTExMTExLDI2LjM1NjM4ODkgQzkzLjEyODg4ODksMjQuOTQ4ODg4OSA5Mi40MTYxMTExLDIzLjI1MjUgOTIuNDUzMzMzMywyMS4yNjYzODg5IEM5Mi40MTYxMTExLDE5LjI5ODMzMzMgOTMuMTA1NTU1NiwxNy42MDYzODg5IDk0LjUyMjIyMjIsMTYuMTkwMjc3OCBDOTUuOTM4MDU1NiwxNC43NzM4ODg5IDk3LjYzLDE0LjA4NDQ0NDQgOTkuNTk4NjExMSwxNC4xMjExMTExIEMxMDEuNDc0NzIyLDE0LjEyMTExMTEgMTAzLjAxNDcyMiwxNC43Mjc3Nzc4IDEwNC4yMTkxNjcsMTUuOTQxOTQ0NCBDMTA1LjQyMzg4OSwxNy4xNTU4MzMzIDEwNi4wMjYzODksMTguNjYzODg4OSAxMDYuMDI2Mzg5LDIwLjQ2NjY2NjcgQzEwNi4wMjYzODksMjEuMTI4MDU1NiAxMDUuOTQzMzMzLDIxLjgwOTQ0NDQgMTA1Ljc3Nzc3OCwyMi41MDc1IEwxMDUuNzc3Nzc4LDIyLjUwNzUgWiIgaWQ9IkZpbGwtMyI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xMTYuMDM1ODMzLDE0LjQyNDE2NjcgTDExNi4wMzU4MzMsMTcuNzA3NSBMMTE1LjA0MjUsMTcuNzA3NSBDMTEzLjkwMTk0NCwxNy43MDc1IDExMy4wMDUyNzgsMTguMDExMTExMSAxMTIuMzUzMDU2LDE4LjYxODA1NTYgQzExMS42OTk0NDQsMTkuMjI0NzIyMiAxMTEuMzczNjExLDIwLjEwNzc3NzggMTExLjM3MzYxMSwyMS4yNjYzODg5IEwxMTEuMzczNjExLDI4LjA4MDU1NTYgTDEwNy42NDkxNjcsMjguMDgwNTU1NiBMMTA3LjY0OTE2NywxNC40MjQxNjY3IEwxMTEuMDcwMjc4LDE0LjQyNDE2NjcgTDExMS4wNzAyNzgsMTYuMDUxOTQ0NCBDMTEyLjAyNjExMSwxNC44NTY5NDQ0IDExMy4yNzcyMjIsMTQuMjU5MTY2NyAxMTQuODIxOTQ0LDE0LjI1OTE2NjcgQzExNS4yODE5NDQsMTQuMjU5MTY2NyAxMTUuNjg2NjY3LDE0LjMxNDE2NjcgMTE2LjAzNTgzMywxNC40MjQxNjY3IiBpZD0iRmlsbC00Ij48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTEyNi41OTc1LDI4LjA4MDU1NTYgTDEzMC4zMjE5NDQsMjguMDgwNTU1NiBMMTMwLjMyMTk0NCw3LjA1ODMzMzMzIEwxMjYuNTk3NSw3LjA1ODMzMzMzIEwxMjYuNTk3NSwyOC4wODA1NTU2IFogTTEyNC44MTg4ODksNy4wNTgzMzMzMyBMMTI0LjgxODg4OSwxMC4zOTY2NjY3IEwxMjMuOTIxOTQ0LDEwLjM5NjY2NjcgQzEyMy4wNTc1LDEwLjM5NjY2NjcgMTIyLjQyNzIyMiwxMC41NjIyMjIyIDEyMi4wMzIyMjIsMTAuODkzMzMzMyBDMTIxLjYzNjY2NywxMS4yMjM4ODg5IDEyMS40MzkxNjcsMTEuNzY2NjY2NyAxMjEuNDM5MTY3LDEyLjUyMDgzMzMgTDEyMS40MzkxNjcsMTQuNDI0MTY2NyBMMTI0LjgxODg4OSwxNC40MjQxNjY3IEwxMjQuODE4ODg5LDE3LjU2OTQ0NDQgTDEyMS40MzkxNjcsMTcuNTY5NDQ0NCBMMTIxLjQzOTE2NywyOC4wODA1NTU2IEwxMTcuNzE0NDQ0LDI4LjA4MDU1NTYgTDExNy43MTQ0NDQsMTIuMTkgQzExNy43MTQ0NDQsMTAuNDk4MDU1NiAxMTguMTc0NDQ0LDkuMjIgMTE5LjA5NDQ0NCw4LjM1NSBDMTIwLjAxMzMzMyw3LjQ5MTExMTExIDEyMS4zMSw3LjA1ODMzMzMzIDEyMi45ODM4ODksNy4wNTgzMzMzMyBMMTI0LjgxODg4OSw3LjA1ODMzMzMzIEwxMjQuODE4ODg5LDcuMDU4MzMzMzMgWiIgaWQ9IkZpbGwtNSI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xMzIuMTM2Mzg5LDIyLjA2NjExMTEgTDEzMi4xMzYzODksMTQuNDI0MTY2NyBMMTM1Ljg2MTExMSwxNC40MjQxNjY3IEwxMzUuODYxMTExLDIyLjM3IEMxMzUuODYxMTExLDIzLjE2MTExMTEgMTM2LjEwNDQ0NCwyMy43OTUyNzc4IDEzNi41OTE5NDQsMjQuMjczNjExMSBDMTM3LjA3OTE2NywyNC43NTE2NjY3IDEzNy43LDI0Ljk5MTExMTEgMTM4LjQ1NDQ0NCwyNC45OTExMTExIEMxMzkuMTg5NzIyLDI0Ljk5MTExMTEgMTM5Ljc5NjY2NywyNC43NDY5NDQ0IDE0MC4yNzQ3MjIsMjQuMjU5NzIyMiBDMTQwLjc1MzA1NiwyMy43NzI1IDE0MC45OTE5NDQsMjMuMTQyMjIyMiAxNDAuOTkxOTQ0LDIyLjM3IEwxNDAuOTkxOTQ0LDE0LjQyNDE2NjcgTDE0NC43MTYzODksMTQuNDI0MTY2NyBMMTQ0LjcxNjM4OSwyMi4wNjYxMTExIEMxNDQuNzE2Mzg5LDIzLjk0MjIyMjIgMTQ0LjEyMzYxMSwyNS40NjkxNjY3IDE0Mi45MzY5NDQsMjYuNjQ1ODMzMyBDMTQxLjc1MDgzMywyNy44MjMzMzMzIDE0MC4yNTYxMTEsMjguNDExNjY2NyAxMzguNDU0NDQ0LDI4LjQxMTY2NjcgQzEzNi42MTQ3MjIsMjguNDExNjY2NyAxMzUuMTAyMjIyLDI3LjgyNzc3NzggMTMzLjkxNjM4OSwyNi42NTk0NDQ0IEMxMzIuNzI5NDQ0LDI1LjQ5MTY2NjcgMTMyLjEzNjM4OSwyMy45NjA4MzMzIDEzMi4xMzYzODksMjIuMDY2MTExMSIgaWQ9IkZpbGwtNiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwb2x5Z29uIGlkPSJGaWxsLTciIHBvaW50cz0iMTQ2LjUzMTExMSAyOC4wODA1NTU2IDE1MC4yNTU1NTYgMjguMDgwNTU1NiAxNTAuMjU1NTU2IDE0LjQyNDE2NjcgMTQ2LjUzMTExMSAxNC40MjQxNjY3Ij48L3BvbHlnb24+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE2Mi4wMTg2MTEsMjQuMDI0NzIyMiBDMTYyLjY3MDU1NiwyMy4zNjI3Nzc4IDE2Mi45OTc3NzgsMjIuNDQzNjExMSAxNjIuOTk3Nzc4LDIxLjI2NjM4ODkgQzE2Mi45OTc3NzgsMjAuMDg5MTY2NyAxNjIuNjY2NjY3LDE5LjE2NSAxNjIuMDA0NzIyLDE4LjQ5MzYxMTEgQzE2MS4zNDIyMjIsMTcuODIyMjIyMiAxNjAuNTIzODg5LDE3LjQ4Njk0NDQgMTU5LjU0OTQ0NCwxNy40ODY5NDQ0IEMxNTguNTM3MjIyLDE3LjQ4Njk0NDQgMTU3LjY5NjExMSwxNy44MzY2NjY3IDE1Ny4wMjQ3MjIsMTguNTM0NzIyMiBDMTU2LjM1MzMzMywxOS4yMzQ0NDQ0IDE1Ni4wMTgwNTYsMjAuMTM1Mjc3OCAxNTYuMDE4MDU2LDIxLjIzODg4ODkgQzE1Ni4wMTgwNTYsMjIuMzYxMTExMSAxNTYuMzQ5MTY3LDIzLjI3MDgzMzMgMTU3LjAxMTExMSwyMy45Njk3MjIyIEMxNTcuNjczMzMzLDI0LjY2OTE2NjcgMTU4LjUxODg4OSwyNS4wMTgzMzMzIDE1OS41NDk0NDQsMjUuMDE4MzMzMyBDMTYwLjU0MjUsMjUuMDE4MzMzMyAxNjEuMzY1LDI0LjY4NzIyMjIgMTYyLjAxODYxMSwyNC4wMjQ3MjIyIFogTTE2Mi45NDI3NzgsNy4wNTgzMzMzMyBMMTY2LjY2NjY2Nyw3LjA1ODMzMzMzIEwxNjYuNjY2NjY3LDI4LjA4MDU1NTYgTDE2My4yNDYxMTEsMjguMDgwNTU1NiBMMTYzLjI0NjExMSwyNi4zOTc1IEMxNjIuMzA4MDU2LDI3Ljc0MDI3NzggMTYwLjg0NTU1NiwyOC40MTE2NjY3IDE1OC44NTk3MjIsMjguNDExNjY2NyBDMTU2Ljk0NjM4OSwyOC40MTE2NjY3IDE1NS4zNjQ3MjIsMjcuNzM1NTU1NiAxNTQuMTE0NzIyLDI2LjM4Mzg4ODkgQzE1Mi44NjMzMzMsMjUuMDMyMjIyMiAxNTIuMjM4NjExLDIzLjMyNjM4ODkgMTUyLjIzODYxMSwyMS4yNjYzODg5IEMxNTIuMjM4NjExLDE5LjIwNjY2NjcgMTUyLjg2MzMzMywxNy41MDA1NTU2IDE1NC4xMTQ3MjIsMTYuMTQ4ODg4OSBDMTU1LjM2NDcyMiwxNC43OTY2NjY3IDE1Ni45NDYzODksMTQuMTIxMTExMSAxNTguODU5NzIyLDE0LjEyMTExMTEgQzE2MC41ODc3NzgsMTQuMTIxMTExMSAxNjEuOTQ5MTY3LDE0LjY2Mzg4ODkgMTYyLjk0Mjc3OCwxNS43NDg4ODg5IEwxNjIuOTQyNzc4LDcuMDU4MzMzMzMgTDE2Mi45NDI3NzgsNy4wNTgzMzMzMyBaIiBpZD0iRmlsbC04Ij48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTU2LjU4OTE2NjcsMTcuNjI0NDQ0NCBMNTQuNTIsMTYuNzE0NDQ0NCBDNTMuNzEwNTU1NiwxNi4zNDY5NDQ0IDUzLjE1NDQ0NDQsMTYuMDIwMjc3OCA1Mi44NTExMTExLDE1LjczNDQ0NDQgQzUyLjU0Nzc3NzgsMTUuNDUgNTIuMzk1ODMzMywxNS4wNzc1IDUyLjM5NTgzMzMsMTQuNjE3Nzc3OCBDNTIuMzk1ODMzMywxNC41NDk0NDQ0IDUyLjQwODg4ODksMTQuNDg4ODg4OSA1Mi40MTU1NTU2LDE0LjQyNDE2NjcgTDQ4LjYyOTQ0NDQsMTQuNDI0MTY2NyBDNDguNjI1Mjc3OCwxNC41MTYzODg5IDQ4LjYxNjM4ODksMTQuNjA2MTExMSA0OC42MTYzODg5LDE0LjcwMDI3NzggQzQ4LjYxNjM4ODksMTYuODg5MTY2NyA1MC4wODc1LDE4LjYzNjM4ODkgNTMuMDMwNTU1NiwxOS45NDIyMjIyIEw1NC45ODg4ODg5LDIwLjgyNDcyMjIgQzU1LjkwODYxMTEsMjEuMjQ4MzMzMyA1Ni41MjQ0NDQ0LDIxLjYwMjIyMjIgNTYuODM3NSwyMS44ODY5NDQ0IEM1Ny4xNTAyNzc4LDIyLjE3MTk0NDQgNTcuMzA2NjY2NywyMi41NzI3Nzc4IDU3LjMwNjY2NjcsMjMuMDg2NjY2NyBDNTcuMzA2NjY2NywyMy43MTI3Nzc4IDU3LjA3NjM4ODksMjQuMjA0MTY2NyA1Ni42MTY5NDQ0LDI0LjU2MzA1NTYgQzU2LjE1Njk0NDQsMjQuOTIxNjY2NyA1NS41MjIyMjIyLDI1LjEwMDgzMzMgNTQuNzEzMzMzMywyNS4xMDA4MzMzIEM1My4wMjA4MzMzLDI1LjEwMDgzMzMgNTEuNTMxMTExMSwyNC4yMTc3Nzc4IDUwLjI0Mzg4ODksMjIuNDUyNSBMNDcuNjc4MzMzMywyNC4zODMzMzMzIEM0OC4zOTU1NTU2LDI1LjYzNDcyMjIgNDkuMzY1NTU1NiwyNi42MTgwNTU2IDUwLjU4ODg4ODksMjcuMzM1NTU1NiBDNTEuODExNjY2NywyOC4wNTMwNTU2IDUzLjE4NjY2NjcsMjguNDExNjY2NyA1NC43MTMzMzMzLDI4LjQxMTY2NjcgQzU2LjU3MDU1NTYsMjguNDExNjY2NyA1OC4wOTcyMjIyLDI3LjkxMDU1NTYgNTkuMjkyNzc3OCwyNi45MDgwNTU2IEM2MC40ODgwNTU2LDI1LjkwNTU1NTYgNjEuMDg2MTExMSwyNC41ODYxMTExIDYxLjA4NjExMTEsMjIuOTQ5MTY2NyBDNjEuMDg2MTExMSwyMS43MzUgNjAuNzI3MjIyMiwyMC43MTk0NDQ0IDYwLjAxMDI3NzgsMTkuOTAwODMzMyBDNTkuMjkyNzc3OCwxOS4wODI1IDU4LjE1MjIyMjIsMTguMzIzODg4OSA1Ni41ODkxNjY3LDE3LjYyNDQ0NDQiIGlkPSJGaWxsLTkiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cG9seWxpbmUgaWQ9IkZpbGwtMTAiIHBvaW50cz0iNjEuMDg2MTExMSA5LjAwNTU1NTU2IDU1LjY2NzUgOS4wMDU1NTU1NiA1NS42Njc1IDExLjcxNSA1OC4zNzY5NDQ0IDExLjcxNSA1OC4zNzY5NDQ0IDE0LjQyNDE2NjcgNjEuMDg2MTExMSAxNC40MjQxNjY3IDYxLjA4NjExMTEgOS4wMDU1NTU1NiI+PC9wb2x5bGluZT4KICAgICAgICAgICAgICAgICAgICA8cG9seWdvbiBpZD0iRmlsbC0xMSIgcG9pbnRzPSIxNTAuMjU1NTU2IDE0LjQyNDE2NjcgMTU0LjM2MTExMSAxNC40MjQxNjY3IDE1NC4zNjExMTEgMTAuMzE4MzMzMyAxNTAuMjU1NTU2IDEwLjMxODMzMzMiPjwvcG9seWdvbj4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMzAuNjk3Nzc3OCwyMy41MDYxMTExIEwyMy40NTg2MTExLDIzLjUwNjExMTEgTDIzLjQ1ODYxMTEsMTYuMjY2OTQ0NCBMMTYuMjE5MTY2NywxNi4yNjY5NDQ0IEwxNi4yMTkxNjY3LDkuMDI3NSBMMzAuNjk3Nzc3OCw5LjAyNzUgTDMwLjY5Nzc3NzgsMjMuNTA2MTExMSBaIE04Ljk4LDMwLjc0NTI3NzggTDE2LjIxOTE2NjcsMzAuNzQ1Mjc3OCBMMTYuMjE5MTY2NywyMy41MDYxMTExIEw4Ljk4LDIzLjUwNjExMTEgTDguOTgsMzAuNzQ1Mjc3OCBaIE0wLDQuMzg0MTY2NjcgTDAsMzUuMzg5MTY2NyBDMCwzNy43ODM4ODg5IDEuOTQxMzg4ODksMzkuNzI1NTU1NiA0LjMzNjM4ODg5LDM5LjcyNTU1NTYgTDM1LjM0MTM4ODksMzkuNzI1NTU1NiBDMzcuNzM2Mzg4OSwzOS43MjU1NTU2IDM5LjY3Nzc3NzgsMzcuNzgzODg4OSAzOS42Nzc3Nzc4LDM1LjM4OTE2NjcgTDM5LjY3Nzc3NzgsNC4zODQxNjY2NyBDMzkuNjc3Nzc3OCwxLjk4OTE2NjY3IDM3LjczNjM4ODksMC4wNDc3Nzc3Nzc4IDM1LjM0MTM4ODksMC4wNDc3Nzc3Nzc4IEw0LjMzNjM4ODg5LDAuMDQ3Nzc3Nzc3OCBDMS45NDEzODg4OSwwLjA0Nzc3Nzc3NzggMCwxLjk4OTE2NjY3IDAsNC4zODQxNjY2NyBMMCw0LjM4NDE2NjY3IFoiIGlkPSJGaWxsLTEyIj48L3BhdGg+CiAgICAgICAgICAgICAgICA8L2c+CiAgICAgICAgICAgIDwvZz4KICAgICAgICA8L2c+CiAgICA8L2c+Cjwvc3ZnPg=="
        alt="Superfluid"
      />
      <Divider/>

      <BalanceDisplayer 
        name="Your"
        address={address}
        selectedChainId={selectedChainId}
        userProvider={userProvider}
        contracts={contracts}
      />
      <Divider/>

      <CashflowDiplayer
        name={"Your"}
        sfUserDetails={sfUserDetails}/>
      
      <RecipientForm
       onRecipientSubmit={onRecipientSubmit}
       onRecipientFailed={onRecipientFailed}
      /> 

    </div>
  );
  

  if (recipient) {
    template.push(
    <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, margin: "auto", marginTop: 64 }}>
      <CashflowDiplayer
        key={recipient.address}
        name={recipient.name}
        sfUserDetails={sfRecipientDetails}/>
              <div></div>

      <FlowForm
        onFlowSubmit={onFlowSubmit}
        onFlowFailed={onFlowFailed}/>
    </div>
    );
  }

  return template;
};
