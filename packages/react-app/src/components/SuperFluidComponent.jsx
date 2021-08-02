import React, { useEffect, useState } from "react";
import SuperfluidSDK from "@superfluid-finance/js-sdk";
import { Button, Divider, Input, Form, InputNumber, Select } from "antd";
import { utils } from "ethers";

import { Address, AddressInput, TokenBalance } from "../components";
import {Transactor} from "../helpers";

import { useUserSigner } from "../hooks"
const { Option } = Select;


// displays Superfluid inflows, outflows and netflows for a given user and token
function CashflowDisplayer({
  sfUser,
  name,
  tokens
}) {

  const [details, setDetails] = useState();
  const [errMsg, setErrMsg] = useState();

  // load cash flow details on user change
  useEffect(async () => {
    for(const token of tokens) {
      if(sfUser && sfUser.hasOwnProperty(token)) {
        try {
          const det = await sfUser[token].details();
          setDetails((prevState) =>{
            return {
              ...prevState,
              [token]: det
            }
          });
          setErrMsg("");
        } catch(err) {
          setErrMsg(err.toString());
        }
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
              {errMsg}
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
  tokens,
  sfRecipient,
  onFlowSubmit,
  onFlowFailed
}) {
  
  const tokenOptions = [];
  for(const token of tokens) {
    tokenOptions.push(<Option value={token}>{token}</Option>)
  }
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

        <Form.Item name="token">
          <Select>
            {tokenOptions}
          </Select>
        </Form.Item>

        <Form.Item name="sfRecipient" initialValue={sfRecipient}></Form.Item>

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
  token,
  tokenContracts,
  superTokenContracts,
  gasPrice,
  userProvider,
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

  const transformToken = (amount, transformType) => {
    // parse user submitted amount
    const parsedBalance = utils.parseUnits(amount.toString(), 18);
    // retrieve supertoken contract object
    const contractCall = superTokenContracts[token + "x"][transformType](parsedBalance);

    // create and execute transaction
    const tx = Transactor(userProvider, gasPrice);
    // TODO: decide wether to keep tx logging or not (modals already displayed)
    tx(contractCall, update => {
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
  }

  // handle upgrade token form submit
  const handleUpgradeSubmit = ({amount, transformType}) => {
    transformToken(amount, "upgrade");
  };

  // handle downgrade token form submit
  const handleDowngradeSubmit = ({amount, transformType}) => {
    transformToken(amount, "downgrade");
  };
  
  const handleError = (errMsg) => {
    console.log('Failed:', errMsg);
  } 

  const template = [];
  template.push(
    <div>
      <h3>{token}: </h3> 
      <TokenBalance 
        img={token}
        name={token}
        provider={userProvider}
        address={address} 
        contracts={tokenContracts}
      />
      <Form
        name="basic"
        layout="vertical"
        onFinish={handleUpgradeSubmit}
        onFinishFailed={handleError}
        requiredMark={false}>
        <Form.Item 
          name="amount"
          initialValue={0}
          >
          <InputNumber/>
        </Form.Item>
        <Button display="block" onClick={onTokenApprove}>
          Approve unlimited {token} spending
        </Button>
        <Form.Item>
          <Button htmlType="submit">
            Upgrade to supertoken
          </Button>
        </Form.Item>
      </Form>
      <h3>{token}x: </h3>
      <TokenBalance 
        name={token + "x"}
        provider={userProvider}
        address={address} 
        contracts={superTokenContracts}
      />
      <Form
        name="basic"
        layout="vertical"
        onFinish={handleDowngradeSubmit}
        onFinishFailed={handleError}
        requiredMark={false}>
        <Form.Item 
          name="amount"
          initialValue={0}
          >
          <InputNumber/>
        </Form.Item>

        <Form.Item>
          <Button htmlType="submit">
            Downgrade to unwrapped token
          </Button>
        </Form.Item>
      </Form>
      <Divider/>
  </div>
  )
  return template;
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
  const [recipients, setRecipients] = useState([]);
  const [sfUser, setSfUser] = useState({});
  const [sfUserDetails, setSfUserDetails] = useState({});
  const [sfRecipients, setSfRecipients] = useState({}); 
  const [tokenContracts, setTokenContracts] = useState({});
  const [superTokenContracts, setSuperTokenContracts] = useState();
  const [initializationError, setInitializationError] = useState("");

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
          setSfUser((prevState) => {
            return {
              ...prevState,
              [token]: user
            }
          });
        }
      }
      console.log("target: ", sfUser)
    }    
  }, [tokenContracts]);

  // once user sets a new recipient, load its superfluid sdk user details
  useEffect(async () => {
    if (sfSDK && recipients.length && recipients[0].hasOwnProperty("address")) {
      for (const recipient of recipients) {
        for (const token of tokens) {
          if (tokenContracts.hasOwnProperty(token+ "x")) {
            const superTokenAddress= tokenContracts[token + "x"].address;
            const recipientUser = sfSDK.user({
              address: recipient.address,
              token: superTokenAddress
            });
            setSfRecipients((prevState) => {
              const prevRecipient = prevState[recipient.name];
              return (
                {
                  ...prevState,
                  [recipient.name]: {
                    ...prevRecipient,
                    [token]: recipientUser,
                  }
                }
              )
            });
          }
        }
      }
    }
  }, [recipients])


  // Form handlers:
  const onRecipientSubmit = (values) => {
    setRecipients([...recipients, values]);
  };

  const onRecipientFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  const onFlowSubmit = async (values) => {
    const flowRate = values.flowRate || 0;

    await sfUser[values.token].flow({
      recipient: values.sfRecipient[values.token].address,
      flowRate
    })
    const details = await sfUser[values.token].details();
    setSfUserDetails(details);
    console.log('Success:', values);
  };


  const onFlowFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  const superTokenUpgraders = [];
  for (const token of tokens) {
    superTokenUpgraders.push(
      <SuperTokenUpgrader 
        name="Your"
        token={token}
        address={address}
        selectedChainId={selectedChainId}
        userProvider={userProvider}
        tokenContracts={tokenContracts}
        superTokenContracts={superTokenContracts}
        gasPrice={gasPrice}
        sfUser={sfUser}
        localProvider={localProvider}
      />
    )
  }
  
  const template=[];
  template.push(
    <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, marginTop: 64, marginBottom: 64 }}>
      <h1>Superfluid </h1>
      <p style={{color: "red"}}>{initializationError}</p>
      <Divider/>
      {superTokenUpgraders}

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

  if (sfRecipients) {
    for (const [name, sfRecipient] of Object.entries(sfRecipients)) {
      template.push(
        <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, marginTop: 64, alignSelf:"flex-start" }}>
          <h2>{name}</h2>
          <FlowForm
            name={name}
            tokens={tokens}
            sfRecipient={sfRecipient}
            onFlowSubmit={onFlowSubmit}
            onFlowFailed={onFlowFailed}/>
          <h3>Balances</h3>
          
          <TokenBalance 
            img={sfRecipient.token}
            name={sfRecipient.token}
            provider={userProvider}
            address={sfRecipient.address} 
            contracts={tokenContracts}
            fontSize={14} />
          <TokenBalance 
            img={sfRecipient.token + "x"}
            name={sfRecipient.token + "x"}
            provider={userProvider}
            address={address} 
            contracts={tokenContracts}
            fontSize={14} />

          <CashflowDisplayer
            name={name}
            tokens={tokens}
            sfUser={sfRecipient}/>
        </div>
      );
    }
  }

  const containerStyle={
    display: "flex", 
    flexWrap: "wrap",
    minWidth: 400,
    margin: "auto",
    justifyContent: "space-evenly", 
  }

  return <div style={containerStyle}>{template}</div>;
};
