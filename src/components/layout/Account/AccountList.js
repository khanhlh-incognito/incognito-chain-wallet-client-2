import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import {
  List,
  ListItem,
  ListItemIcon,
  Button,
  Tooltip,
  CircularProgress
} from "@material-ui/core";
import AccountSend from "@src/components/layout/Account/AccountSend";

import { Send as IconSend } from "@material-ui/icons";
import Dialog from "@src/components/core/Dialog";
import img1 from "@assets/images/img1.png";
import "@src/components/layout/Account/List.scss";
import { flow } from "lodash";
import { connectWalletContext } from "@src/common/context/WalletContext";
import { connectAccountContext } from "@src/common/context/AccountContext";
import styled from "styled-components";
import cls from "classnames";
import { formatPRVAmount } from "@src/common/utils/format";

const styles = theme => ({
  root: {
    width: "100%",
    backgroundColor: theme.palette.background.paper,
    ...theme.mixins.gutters(),
    marginTop: theme.spacing.unit * 5
  },
  button: {
    margin: theme.spacing.unit
  },
  progress: {
    position: "absolute",
    left: "calc(50% - 25px)",
    top: "10rem"
  }
});

class AccountList extends React.Component {
  static propTypes = {
    accounts: PropTypes.array.isRequired,
    onChangeAccount: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.state = {
      walletName: "",
      accountSelected: false,
      // accountList: [],
      modalAccountDetail: "",
      modalAccountSend: "",
      loading: false
    };
  }

  chooseAccount = account => {
    this.props.onChangeAccount(account);
  };

  openAccountSend = account => {
    this.modalAccountDetailRef.close();
    this.setState({
      modalAccountDetail: "",
      modalAccountSend: <AccountSend />
    });
    this.modalAccountSendRef.open();
  };

  get detailButtonAction() {
    const { classes } = this.props;

    return (
      <div>
        <Tooltip title="Send Coin">
          <Button
            mini
            variant="fab"
            color="secondary"
            className={classes.button}
            aria-label="Send Coin"
            onClick={() => this.openAccountSend()}
          >
            <IconSend />
          </Button>
        </Tooltip>
      </div>
    );
  }

  isSelectedAccount = account => {
    return account.name === this.props.account.name;
  };

  render() {
    const { classes } = this.props;
    const {
      loading,
      // accountList,
      modalAccountDetail,
      modalAccountSend
    } = this.state;
    const accountList = this.props.accounts;
    if (accountList.length === 0) return null;
    return (
      <div className="wrapperAccountList">
        {/*<div className="walletName">{walletName}</div>*/}
        <List component="nav">
          {accountList.map(a => {
            return (
              <StyledListItem
                button
                key={a.name}
                onClick={() => this.chooseAccount(a)}
                className={cls({ isSelected: this.isSelectedAccount(a) })}
              >
                <StyledListItemIcon>
                  <Icon
                    className={cls({ isSelected: this.isSelectedAccount(a) })}
                  />
                </StyledListItemIcon>
                <div className="accountName" style={{ paddingRight: 10 }}>
                  <div>{a.name}</div>
                  <Balance>
                    {a.value === -1 || isNaN(a.value) ? (
                      <CircularProgress size={20} />
                    ) : (
                      formatPRVAmount(a.value)
                    )}
                  </Balance>
                </div>
              </StyledListItem>
            );
          })}
        </List>
        <div className="line" />
        {!loading && accountList.length <= 0 && (
          <div className="text-center">
            <img src={img1} alt="" />
            <h3 className="text-secondary mt-3">Not found your account(s)</h3>
          </div>
        )}
        {loading && (
          <CircularProgress className={classes.progress} color="secondary" />
        )}
        <Dialog
          title="Account Detail"
          onRef={modal => (this.modalAccountDetailRef = modal)}
          className={{ margin: 0 }}
          buttonAction={this.detailButtonAction}
        >
          {modalAccountDetail}
        </Dialog>

        <Dialog
          title="Send Coin"
          onRef={modal => (this.modalAccountSendRef = modal)}
          className={{ margin: 0 }}
        >
          {modalAccountSend}
        </Dialog>
      </div>
    );
  }
}

AccountList.propTypes = {
  classes: PropTypes.object.isRequired
};

export default flow([
  withStyles(styles),
  connectWalletContext,
  connectAccountContext
])(AccountList);

const StyledListItem = styled(ListItem)`
  &.isSelected {
    pointer-events: none;
  }
`;

const Icon = styled.div`
  &.isSelected {
    background-color: #4be1a6;
  }
  height: 10px;
  width: 10px;
  border-radius: 5px;
`;

const Balance = styled.div`
  color: #838aa7;
  font-size: 16px;
  font-weight: 400;
`;

const StyledListItemIcon = styled(ListItemIcon)`
  align-self: flex-start;
  padding-top: 10px;
`;
