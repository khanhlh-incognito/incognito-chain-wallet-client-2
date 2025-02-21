import {
  Wallet,
  RpcClient,
  getEstimateFee,
  getEstimateFeeForSendingToken,
  getEstimateFeeToDefragment,
  getEstimateTokenFee,
  getMaxWithdrawAmount
} from "incognito-chain-web-js/build/wallet";

function getRpcClient() {
  return Wallet.RpcClient;
}

export function setRpcClient(server, username, password) {
  Wallet.RpcClient = new RpcClient(server, username, password);
}

export function listCustomTokens() {
  return getRpcClient().listCustomTokens();
}

export function listPrivacyTokens() {
  return getRpcClient().listPrivacyCustomTokens();
}

export async function getEstimateFeeService(
  from,
  to,
  amount,
  privateKey,
  accountWallet,
  isPrivacy
) {
  console.log("Estimating fee ...");
  let fee;
  try {
    fee = await getEstimateFee(
      from,
      to,
      amount,
      privateKey,
      accountWallet,
      isPrivacy,
      getRpcClient()
    );
  } catch (e) {
    throw e;
  }
  return fee;
}

export async function getEstimateFeeForSendingTokenService(
  from,
  to,
  amount,
  tokenObject,
  privateKey,
  account,
  isPrivacyForPrivateToken,
  feeToken
) {
  console.log("getEstimateFeeForSendingToken");
  console.log("\tfrom:" + from);
  console.log("\tto: " + to);
  console.log("\tamount:" + amount);
  console.log("\ttokenObject", tokenObject);
  console.log("\tprivateKey", privateKey);

  let fee;
  try {
    fee = await getEstimateFeeForSendingToken(
      from,
      to,
      amount,
      tokenObject,
      privateKey,
      account,
      getRpcClient(),
      isPrivacyForPrivateToken,
      feeToken
    );
  } catch (e) {
    throw e;
  }
  return fee;
}

/**
 *
 * @param {string} from
 * @param {string} to
 * @param {number} amount     // default = 0 for transfer
 * @param {{Privacy: boolean, TokenID: string, TokenName: string, TokenSymbol: string, TokenTxType: number, TokenAmount: number, TokenReceivers: {PaymentAddress: string, Amount: number}}} tokenObject
 * @param {string} privateKey
 * @param {AccountWallet} account
 * @param {bool} isPrivacyForPrivateToken   // default true
 */
export async function getEstimateTokenFeeService(
  from,
  to,
  amount,
  tokenObject,
  privateKey,
  account,
  isPrivacyForPrivateToken
) {
  console.log("getEstimateTokenFee");
  console.log("\tfrom:" + from);
  console.log("\tto: " + to);
  console.log("\tamount:" + amount);
  console.log("\ttokenObject", tokenObject);
  console.log("\tprivateKey", privateKey);
  console.log("HHHHHHHH : ", typeof getEstimateTokenFee);

  let fee;
  try {
    fee = await getEstimateTokenFee(
      from,
      to,
      amount,
      tokenObject,
      privateKey,
      account,
      getRpcClient(),
      isPrivacyForPrivateToken
    );
  } catch (e) {
    throw e;
  }
  return fee;
}

export async function getEstimateFeeToDefragmentService(
  from,
  amount,
  privateKey,
  accountWallet,
  isPrivacy
) {
  console.log("Estimating fee ...");
  let fee;
  try {
    fee = await getEstimateFeeToDefragment(
      from,
      amount,
      privateKey,
      accountWallet,
      isPrivacy,
      getRpcClient()
    );
  } catch (e) {
    throw e;
  }
  return fee;
}

export async function getStakingAmount(type) {
  let resp;
  try {
    resp = await getRpcClient().getStakingAmount(type);
  } catch (e) {
    throw e;
  }
  return resp.res;
}

export async function getActiveShard() {
  let resp;
  try {
    resp = await getRpcClient().getActiveShard();
  } catch (e) {
    throw e;
  }

  return resp.shardNumber;
}

export async function getMaxShardNumber() {
  let resp;
  try {
    resp = await getRpcClient().getMaxShardNumber();
  } catch (e) {
    throw e;
  }

  return resp.shardNumber;
}

export async function hashToIdenticon(hashStrs) {
  let resp;
  try {
    resp = await getRpcClient().hashToIdenticon(hashStrs);
  } catch (e) {
    throw e;
  }

  return resp.images;
}

/**
 *
 * @param {string} from
 * @param {string} to
 * @param {{Privacy: boolean, TokenID: string, TokenName: string, TokenSymbol: string, TokenTxType: number, TokenAmount: number, TokenReceivers: {PaymentAddress: string, Amount: number}}} tokenObject
 * @param {string} privateKeyStr
 * @param {AccountWallet} account
 * @param {bool} isPrivacyForPrivateToken   // default true
 * @param {{maxWithdrawAmount: number, feeCreateTx : number, feeForBurn: number}} response
 */
export async function getMaxWithdrawAmountService(
  from,
  to,
  tokenObject,
  privateKey,
  account,
  isPrivacyForPrivateToken
) {
  let response;
  try {
    response = await getMaxWithdrawAmount(
      from,
      to,
      tokenObject,
      privateKey,
      account,
      getRpcClient(),
      isPrivacyForPrivateToken
    );
  } catch (e) {
    throw e;
  }
  return response;
}
