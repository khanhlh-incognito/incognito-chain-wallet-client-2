import React from "react";
import { withStyles } from "@material-ui/core/styles";
import ConfirmDialog from "@src/components/core/ConfirmDialog";
import Account from "@src/services/Account";
import {
  Button,
  TextField,
  Select,
  MenuItem,
  Checkbox
} from "@material-ui/core";
import { useAccountContext } from "@src/common/context/AccountContext";
import toastr from "toastr";
import { useWalletContext } from "@src/common/context/WalletContext";
import { useAccountListContext } from "@src/common/context/AccountListContext";
import { fromEvent, combineLatest } from "rxjs";
import {
  map,
  debounceTime,
  switchMap,
  distinctUntilChanged,
  filter,
  startWith
} from "rxjs/operators";
import * as rpcClientService from "@src/services/RpcClientService";
import { useDebugReducer } from "@src/common/hook/useDebugReducer";
import { useAppContext } from "@src/common/context/AppContext";
import { Loading } from "@src/common/components/loading/Loading";
import {
  getAccountBalance,
  saveAccountBalance,
  clearAccountBalance
} from "@src/services/CacheAccountBalanceService";
import { formatPRVAmount } from "@src/common/utils/format";
import { toPRV, BurnAddress } from "incognito-chain-web-js/build/wallet";
import constants from "../../../../constants";
import { NanoUnit, PrivacyUnit } from "@src/common/utils/constants";

import QRScanner from "@src/common/components/qrScanner";
import detectBrowser from "@src/services/BrowserDetect";

const styles = theme => ({
  textField: {
    width: "100%"
  },
  selectField: {
    width: "100%",
    marginBottom: "0.5rem"
  },
  button: {
    marginTop: theme.spacing.unit * 2,
    height: "3rem"
  },
  select: {
    "font-size": "13px"
  }
});

function reducer(state, action) {
  switch (action.type) {
    case "CHANGE_INPUT":
      return { ...state, [action.name]: action.value };
    case "RESET":
      return { ...state, amount: "", toAddress: "", fee: "", minFee: "" };
    case "LOAD_ESTIMATION_FEE":
      return { ...state, isLoadingEstimationFee: true };
    case "LOAD_ESTIMATION_FEE_SUCCESS":
      return {
        ...state,
        isLoadingEstimationFee: false,
        fee: action.fee / PrivacyUnit,
        minFee: action.fee / PrivacyUnit
      };
    case "SHOW_LOADING":
      return { ...state, isLoading: action.isShow };
    default:
      return state;
  }
}

const refs = { modalConfirmationRef: null }; //TODO - remove this

function AccountStaking({
  classes,
  isOpen,
  amountStakingShard,
  amountStakingBeacon
}) {
  console.log("BurnAddress: ", BurnAddress);
  const amountInputRef = React.useRef();
  const toInputRef = React.useRef();
  let stakingTypeRef = React.useRef();
  const autoReStakingRef = React.useRef();

  const { wallet } = useWalletContext();
  const account = useAccountContext();
  const accounts = useAccountListContext();
  const { appDispatch } = useAppContext();
  const accountWallet = wallet.getAccountByName(account.name);

  let balance;
  try {
    balance = accounts.find(({ name }) => name === account.name).value;
  } catch (e) {
    console.error(e);
    balance = -1;
  }

  React.useEffect(() => {
    reloadBalance();
  }, []);

  async function reloadBalance() {
    let balance = getAccountBalance(account.name);
    if (balance == -1) {
      balance = await wallet.getAccountByName(account.name).getBalance();
      saveAccountBalance(balance, account.name);
    }
    appDispatch({
      type: "SET_ACCOUNT_BALANCE",
      accountName: account.name,
      balance
    });
  }

  let [state, dispatch] = useDebugReducer(
    "AccountSend",
    reducer,
    account,
    account => ({
      paymentAddress: account.PaymentAddress,
      toAddress: BurnAddress,
      amount: toPRV(amountStakingShard),
      fee: "",
      minFee: "",
      showAlert: "",
      isAlert: false,
      isPrivacy: "0",
      stakingType: "0", // default is shard
      autoReStakingRef: "1",
      candidatePaymentAddress: account.PaymentAddress,
      candidateMiningSeedKey: account.BlockProducerKey,
      rewardReceiverPaymentAddress: account.PaymentAddress
    })
  );

  React.useEffect(() => {
    const stakingTypeObservable = fromEvent(stakingTypeRef.node, "change").pipe(
      map(e => e.target.value),
      filter(Boolean),
      debounceTime(750),
      distinctUntilChanged(),
      startWith("")
    );

    const subscription = combineLatest(stakingTypeObservable)
      .pipe(
        filter(([stakingType]) => {
          return true;
        }),
        switchMap(([stakingType]) => {
          if (balance <= 0) {
            toastr.warning(
              "Get some PRV from the faucet to get started.alance is zero!"
            );
            return Promise.resolve(0);
          }
          dispatch({ type: "LOAD_ESTIMATION_FEE" });
          console.log("Estimate fee .......");
          return rpcClientService
            .getEstimateFeeService(
              account.PaymentAddress,
              state.toAddress,
              Number(amountInputRef.current.value) * PrivacyUnit,
              account.PrivateKey,
              accountWallet,
              false
            )
            .catch(e => {
              console.error(e);
              toastr.error("Error on get estimation fee! " + e.toString());
              return Promise.resolve(0);
            });
        })
      )
      .subscribe(
        fee => {
          dispatch({ type: "LOAD_ESTIMATION_FEE_SUCCESS", fee });
          setTimeout(
            () => dispatch({ type: "LOAD_ESTIMATION_FEE_SUCCESS", fee }),
            200
          ); // tricky, make Fee textfield re-render to prevent label overlap
        },
        error => {
          dispatch({ type: "LOAD_ESTIMATION_FEE_ERROR" });
          console.error(error);
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const confirmStaking = () => {
    const {
      toAddress,
      fee,
      minFee,
      EstimateTxSizeInKb,
      GOVFeePerKbTx,
      stakingType
    } = state;

    let { amount } = state;
    amount = Number(amount);

    if (stakingType != "0" && stakingType != "1") {
      toastr.warning("Staking type is invalid!");
      return;
    }

    if (!toAddress) {
      toastr.warning("Please enter a receiving address.");
      return;
    }

    if (toAddress != BurnAddress) {
      toastr.warning("To address must be burning address!");
      return;
    }

    if (!amount) {
      toastr.warning("Enter an amount");
      return;
    }

    if (isNaN(amount)) {
      toastr.warning("Amount is invalid!");
      return;
    }

    if (Number(amount) < Number(NanoUnit)) {
      toastr.warning("Amount must be at least 0.000000001 PRV!");
      return;
    }

    if (isNaN(fee)) {
      toastr.warning("Fee is invalid!");
      return;
    }

    if (Number(fee) < 0) {
      toastr.warning("Fee must be at least 0 PRV!");
      return;
    } else {
      if (Number(fee) < minFee) {
        toastr.warning("Fee must be greater than min fee!");
      }
    }

    if (Number(amount) >= Number(balance)) {
      toastr.warning(
        "Please make sure you have sufficient funds to make this transfer."
      );
      return;
    }

    if (
      (stakingType == "0" && amount != amountStakingShard / PrivacyUnit) ||
      (stakingType == "1" && amount != amountStakingBeacon / PrivacyUnit)
    ) {
      toastr.warning("Amount is invalid!");
      return;
    }

    if (Number(fee) / EstimateTxSizeInKb < GOVFeePerKbTx) {
      toastr.warning(
        `Fee per Tx (Fee/${EstimateTxSizeInKb}) must not lesser then GOV Fee per KbTx (${GOVFeePerKbTx})`
      );
    }

    refs.modalConfirmationRef.open();
  };

  async function staking() {
    dispatch({ type: "SHOW_LOADING", isShow: true });

    // isPrivacy in state is string
    let {
      fee,
      stakingType,
      candidatePaymentAddress,
      candidateMiningSeedKey,
      rewardReceiverPaymentAddress,
      autoReStaking
    } = state;
    debugger;

    try {
      var result = await Account.staking(
        { type: Number(stakingType) },
        Number(fee) * PrivacyUnit,
        candidatePaymentAddress,
        candidateMiningSeedKey,
        rewardReceiverPaymentAddress,
        autoReStaking === "1" ? true : false,
        account,
        wallet
      );

      if (result.txId) {
        clearAccountBalance(account.name);
        toastr.success("Completed: ", result.txId);
        dispatch({ type: "RESET" });
      } else {
        console.log("Create tx err: ", result.err);
        toastr.error(
          "Staking failed. Please try again! Err:" + result.err.Message
        );
      }
    } catch (e) {
      // let msg = e.toString();
      console.log("Create tx err: ", e);
      toastr.error("Staking failed. Please try again!");
    }

    dispatch({ type: "SHOW_LOADING", isShow: false });
  }

  const onChangeInput = name => e => {
    if (name === "stakingType") {
      const amountVal =
        e.target.value == "0"
          ? toPRV(amountStakingShard)
          : toPRV(amountStakingBeacon);
      dispatch({ type: "CHANGE_INPUT", name: "amount", value: amountVal });
      return;
    }

    if (name === "autoReStaking") {
      const value = e.target.value === "1" ? "0" : "1";

      dispatch({ type: "CHANGE_INPUT", name: "autoReStaking", value: value });
      return;
    }

    dispatch({ type: "CHANGE_INPUT", name, value: e.target.value });
  };

  const onValidator = name => e => {
    if (name === "toAddress") {
      let isValid = Account.checkPaymentAddress(e.target.value);
      console.log("isValid: ", isValid);
      if (!isValid) {
        toastr.warning("Receiver's address is invalid!");
      }
    } else if (name === "amount") {
      if (Number(e.target.value) < Number(NanoUnit)) {
        toastr.warning("Amount must be at least 0.000000001 PRV!");
      }
    } else if (name === "fee") {
      if (Number(e.target.value) < 0) {
        toastr.warning("Fee must be at least 0 PRV!");
      } else {
        if (Number(e.target.value) < state.minFee) {
          toastr.warning("Fee must be greater than min fee!");
        }
      }
    }
  };

  return (
    <div style={{ padding: "2rem", width: "100%" }}>
      {state.showAlert}
      <TextField
        disabled
        required
        id="fromAddress"
        label="From"
        className={classes.textField}
        margin="normal"
        variant="outlined"
        value={state.paymentAddress}
        onChange={onChangeInput("paymentAddress")}
      />

      <div className="row">
        <div className="col-sm">
          <div>
            <Select
              label="Staking Type"
              id="stakingType"
              onChange={e => onChangeInput("stakingType")(e)}
              inputRef={select => {
                stakingTypeRef = select;
              }}
              value={state.stakingType}
            >
              <MenuItem value="0">Shard Validator</MenuItem>
            </Select>
          </div>
        </div>
        {console.log("state.stakingType: ", state.stakingType)}
        <div className="col-sm">
          <div className="text-right">
            Balance: {balance ? formatPRVAmount(balance) : 0}{" "}
            {constants.NATIVE_COIN}
          </div>
        </div>
      </div>

      <TextField
        required
        disabled
        id="toAddress"
        label="To"
        className={classes.textField}
        margin="normal"
        variant="outlined"
        value={state.toAddress}
        onChange={e => onChangeInput("toAddress")(e)}
        onBlur={e => onValidator("toAddress")(e)}
        inputProps={{ ref: toInputRef }}
      />

      <TextField
        required
        disabled
        id="amount"
        label="Amount"
        className={classes.textField}
        margin="normal"
        variant="outlined"
        value={state.amount}
        onChange={e => onChangeInput("amount")(e)}
        onBlur={e => onValidator("amount")(e)}
        inputProps={{ ref: amountInputRef }}
      />

      <TextField
        required
        id="fee"
        label={"Min Fee " + state.minFee}
        className={classes.textField}
        margin="normal"
        variant="outlined"
        value={state.fee}
        onChange={onChangeInput("fee")}
        onBlur={e => onValidator("fee")(e)}
      />

      <TextField
        required
        id="candidatePaymentAddress"
        label="Candidate payment address"
        className={classes.textField}
        margin="normal"
        variant="outlined"
        value={state.candidatePaymentAddress}
        onChange={e => {
          onChangeInput("candidatePaymentAddress")(e);
        }}
        onBlur={e => onValidator("candidatePaymentAddress")(e)}
        inputProps={{ ref: toInputRef }}
      />

      <TextField
        required
        id="candidateMiningSeedKey"
        label="Candidate mining key seed"
        className={classes.textField}
        margin="normal"
        variant="outlined"
        value={state.candidateMiningSeedKey}
        onChange={e => {
          onChangeInput("candidateMiningSeedKey")(e);
        }}
        onBlur={e => onValidator("candidateMiningSeedKey")(e)}
        inputProps={{ ref: toInputRef }}
      />

      <TextField
        required
        id="rewardReceiverPaymentAddress"
        label="Reward receiver payment address"
        className={classes.textField}
        margin="normal"
        variant="outlined"
        value={state.rewardReceiverPaymentAddress}
        onChange={e => {
          onChangeInput("rewardReceiverPaymentAddress")(e);
        }}
        onBlur={e => onValidator("rewardReceiverPaymentAddress")(e)}
        inputProps={{ ref: toInputRef }}
      />

      <div className="col-sm">
        <div>
          <Checkbox
            label="Auto re-staking?"
            id="autoReStaking"
            checked={state.autoReStaking === "1"}
            value={state.autoReStaking}
            onChange={onChangeInput("autoReStaking")}
            color="primary"
            inputProps={{ ref: autoReStakingRef }}
          />
          Auto re-staking
        </div>
      </div>

      <Button
        variant="contained"
        size="large"
        color="primary"
        className={classes.button}
        fullWidth
        onClick={() => confirmStaking()}
      >
        Stake
      </Button>
      {state.isLoadingEstimationFee ? (
        <div className="badge badge-pill badge-light mt-3">
          * Loading estimation <b>MIN FEE</b>...
        </div>
      ) : null}

      <ConfirmDialog
        title="Confirmation"
        onRef={modal => (refs.modalConfirmationRef = modal)}
        onOK={() => staking()}
        className={{ margin: 0 }}
      >
        <div>Are you sure to stake {state.amount} PRV?</div>
      </ConfirmDialog>

      {state.isLoading && <Loading fullscreen />}
    </div>
  );
}

export default withStyles(styles)(AccountStaking);
