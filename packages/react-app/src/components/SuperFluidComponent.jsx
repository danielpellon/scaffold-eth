import React, { useEffect, useState } from "react";
import SuperfluidSDK from "@superfluid-finance/js-sdk";
import { Button, Divider, Input, Form, InputNumber } from "antd";
import { utils } from "ethers";

import { Address, AddressInput, TokenBalance } from "../components";
import {Transactor} from "../helpers";

import { useUserSigner } from "../hooks"
const fDAIxAddress = "0xe3cb950cb164a31c66e32c320a800d477019dcff";

// displays Superfluid inflows, outflows and netflows using the sfSDK for a given token
function CashflowDisplayer({
  sfUser,
  name,
  tokens
}) {

  const [details, setDetails] = useState();

  useEffect(async () => {
    for(const token of tokens) {
      if(sfUser && sfUser.hasOwnProperty(token)) {
        const det = await sfUser[token].details();
        console.log("ignore ", det);
        setDetails((prevState) =>{
          return {
            ...prevState,
            [token]: det
          }
        });
      }
    }
  }, [sfUser])

  if (!sfUser) {
    return <h1>...</h1>;
  }
  
  const template=[]
  for (const [token, _] of Object.entries(sfUser)) {
    if(details && details.hasOwnProperty(token) && details[token].hasOwnProperty("cfa") && details[token].cfa.hasOwnProperty("flows")) {
      // generate inflow and outflow display templates
        const flowTypes = ["inFlows", "outFlows"];
        
        for(const flowType of flowTypes) {
          const flows = details[token].cfa.flows[flowType];
          template.push(
            <div>
              <h3>{name} {token} {flowType}</h3>
            </div>
          );

          if (flows && flows.length) {
            for (const flow of flows) {
              template.push(
                <div>
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
            <h3>{name} {token} netflow</h3>
            {details[token].cfa.netFlow}
            <Divider />
          </div>
          
        )
      }
  }  
  return template
}

// form to add a new cashflow recipient
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
      <AddressInput/>
    </Form.Item>


    <Form.Item >
      <Button type="primary" htmlType="submit">
        Create new recipient
      </Button>
    </Form.Item>
  </Form>
  )
}

// form to start a new flow/stream 
function FlowForm({
  onFlowSubmit,
  onFlowFailed
}) {
  return (
      <Form
        layout="vertical"
        onFinish={onFlowSubmit}
        onFinishFailed={onFlowFailed}
        requiredMark={false}
      >
        <h3>Flow rate</h3>
        <Form.Item
          labelAlign="left"
          name="flowRate"
          initialValue={0}
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

// Retrieves and displays passed token and supertoken balance, and proivdes
// form to wrap/unwrap them
function SuperTokenUpgrader({
  address,
  name,
  token,
  tokenContracts,
  superTokenContracts,
  gasPrice,
  userProvider  
}) {
  
  if(!address || !tokenContracts.hasOwnProperty(token+"x")){
    return <h1>...</h1>
  }

  const superTokenAddress=tokenContracts[token + "x"].address;

  const onTokenApprove = (e) => {
    e.preventDefault();
    // given the scope of the template, we use unlimited token approvals
    const parsedBalance = utils.parseUnits("1000000000000", 18);
    
    // create and execute approval tx
    const tx = Transactor(userProvider, gasPrice);
    tx(tokenContracts[token].approve(superTokenAddress, parsedBalance), update => {
      console.log("📡 Transaction Update:", update);
      if (update && (update.status === "confirmed" || update.status === 1)) {
        console.log(" 🍾 Transaction " + update.hash + " finished!");
        console.log(
          " ⛽️ " +
            update.gasUsed +
            "/" +
            (update.gasLimit || update.gas) +
            " @ " +
            parseFloat(update.gasPrice) / 1000000000 +
            " gwei",
        );
      }
    }).then(result => {console.log(result)});
  };  

  const onMintSubmit = (values) => {
    // parse user submitted amount
    const parsedBalance = utils.parseUnits(values.fDAI.toString(), 18);

    // create and execute transaction
    const tx = Transactor(userProvider, gasPrice);

    // TODO: decide wether to keep tx logging or not (modals already displayed)
    console.log(superTokenContracts.fDAIx.upgrade);
    tx(superTokenContracts.fDAIx.upgrade(parsedBalance), update => {
      console.log("📡 Transaction Update:", update);
      if (update && (update.status === "confirmed" || update.status === 1)) {
        console.log(" 🍾 Transaction " + update.hash + " finished!");
        console.log(
          " ⛽️ " +
            update.gasUsed +
            "/" +
            (update.gasLimit || update.gas) +
            " @ " +
            parseFloat(update.gasPrice) / 1000000000 +
            " gwei",
        );
      }
    }).then(result => {console.log(result)});
  };
  

  const onMintFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  return(
    <div>
      <h2>{name} balances</h2>
      <h3>fDAI: </h3>
      <TokenBalance 
        name={token}
        provider={userProvider}
        address={address} 
        contracts={tokenContracts}
      />
      <div>
        <Form
          name="basic"
          layout="vertical"
          onFinish={onMintSubmit}
          onFinishFailed={onMintFailed}
          requiredMark={false}>
          <Form.Item 
            name={token}
            initialValue={0}
            >
            <InputNumber/>
          </Form.Item>
          <div>
            <Button display="block" onClick={onTokenApprove}>
              Approve unlimited {token} spending
            </Button>
            <Form.Item>
              <Button htmlType="submit">
                Upgrade to supertoken
              </Button>
            </Form.Item>
          </div>
          
        </Form>
      </div>
      <h3>{token}x: </h3>
      <TokenBalance 
        name={token + "x"}
        provider={userProvider}
        address={address} 
        contracts={superTokenContracts}
      />
  </div>
  )
}

// TODO: need to do free up (the sdk?) when exiting component to avoid memory leak
export default function SuperFluidComponent(
  {
    address,
    localProvider,
    injectedProvider,
    selectedChainId,
    gasPrice,
    tokens
  }) {

  const [sfSDK, setSfSDK] = useState();
  const [recipient, setRecipient] = useState();
  const [sfUser, setSfUser] = useState({});
  const [sfUserDetails, setSfUserDetails] = useState({});
  const [sfRecipient, setSfRecipient] = useState();
  const [tokenContracts, setTokenContracts] = useState({});
  const [superTokenContracts, setSuperTokenContracts] = useState();
  const [initializationError, setInitializationError] = useState("");
  const [superTokenAddresses, setSuperTokenAddresses] = useState({});
  // scaffold-eth hooks
  // get user provider
  const userProvider = useUserSigner(injectedProvider, localProvider);
  
  // Initialize Superfluid SDK, runs at component initialization or when the
  // web3 provider changes
   useEffect(async () => {
    if (injectedProvider) {
      const sf = new SuperfluidSDK.Framework({
        ethers: injectedProvider,
        // ethers: new Web3Provider(window.ethereum),
        tokens,
      })
      try {
        await sf.initialize();
        console.log("💧 Superfluid SDK: ", sf);
        setSfSDK(sf);
  
        const tContracts = await sf.tokens;
        const superTContracts = await sf.superTokens;
        setTokenContracts(tContracts);
        setSuperTokenContracts(superTContracts);
      } catch(err) {
        setInitializationError(err.toString());
      }
    }
  }, [userProvider]);
 
  // watch for sdk and load super fluid sdk user object for current user
  useEffect(async () => {
    if (sfSDK && tokenContracts) {
      for (const token of tokens) {
        if (tokenContracts.hasOwnProperty(token+ "x")) {
          const superTokenAddress= tokenContracts[token + "x"].address;
          const user = sfSDK.user({
            address: address,
            token: superTokenAddress
          });
          setSuperTokenAddresses((prevState) => {
            return {
              ...prevState,
              [token]: superTokenAddress
            }
          });
          setSfUser((prevState) => {
            return {
              ...prevState,
              [token]: user
            }
          });
        }
      }
    }    
  }, [sfSDK, tokenContracts]);

  // once user sets a new recipient, load its superfluid sdk user details
  useEffect(async () => {
    if (sfSDK && recipient && recipient.hasOwnProperty("address")) {
      for (const token of tokens) {
        if (tokenContracts.hasOwnProperty(token+ "x")) {
          const superTokenAddress= tokenContracts[token + "x"].address;
          const recipientUser = sfSDK.user({
            address: address,
            token: superTokenAddress
          });
          setSfRecipient((prevState) => {
            return {
              ...prevState,
              [token]: recipientUser
            }
          });
        }
      }
    }
  }, [recipient, sfUserDetails])


  // Form handlers:
  const onRecipientSubmit = (values) => {
    setRecipient(values);
  };

  const onRecipientFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  const onFlowSubmit = async (values) => {
    const flowRate = values.flowRate || 0;
    await sfUser.flow({
      recipient: recipient.address,
      flowRate
    })
    const details = await sfUser.details();
    setSfUserDetails(details);
    console.log('Success:', values);
  };


  const onFlowFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };
  
  const template=[];
  template.push(
    <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, marginTop: 64, marginBottom: 64 }}>
      <h1>Superfluid </h1>
      <p style={{color: "red"}}>{initializationError}</p>
      <Divider/>
      <SuperTokenUpgrader 
        name="Your"
        token={"fDAI"}
        address={address}
        selectedChainId={selectedChainId}
        userProvider={userProvider}
        tokenContracts={tokenContracts}
        superTokenContracts={superTokenContracts}
        gasPrice={gasPrice}
        sfUser={sfUser}
        localProvider={localProvider}
      />
      <Divider/>

      <RecipientForm
       onRecipientSubmit={onRecipientSubmit}
       onRecipientFailed={onRecipientFailed}
       /> 
      
      <Divider/>
      <CashflowDisplayer
        name={"Your"}
        tokens={tokens}
        sfUser={sfUser}
        sfUserDetails={sfUserDetails}/>

    </div>
  );

  if (recipient) {
    template.push(
    <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, marginTop: 64, alignSelf:"flex-start" }}>
      <h3>Balances</h3>
      <TokenBalance 
        img="fDAI"
        name={"fDAI"}
        provider={userProvider}
        address={recipient.address} 
        contracts={tokenContracts}
        fontSize={14} />
      <TokenBalance 
        img="fDAIx"
        name={"fDAIx"}
        provider={userProvider}
        address={address} 
        contracts={tokenContracts}
        fontSize={14} />

      <CashflowDisplayer
        name={recipient.name}
        tokens={tokens}
        sfUser={sfRecipient}/>

      <FlowForm
        onFlowSubmit={onFlowSubmit}
        onFlowFailed={onFlowFailed}/>
    </div>
    );
  }

  const containerStyle={
    display: "flex", 
    minWidth: 400,  
    margin: "auto",
    justifyContent: "space-evenly", 
  }

  return <div style={containerStyle}>{template}</div>;
};
