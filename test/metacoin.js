const MetaCoin = artifacts.require("./MetaCoin.sol");

contract('MetaCoin', function(accounts) {
  async function getBalanceNumber(meta, account) {
    return (await meta.getBalance.call(account)).toNumber();
  }

  async function getBalanceInEthNumber(meta, account) {
    return (await meta.getBalanceInEth.call(account)).toNumber();
  }

  it("should put 10000 MetaCoin in the first account", async () => {
    let meta = await MetaCoin.deployed();
    let balance = await meta.getBalance.call(accounts[0]);
    assert.equal(balance.valueOf(), 10000, "10000 wasn't in the first account");
  });

  it("should call a function that depends on a linked library", async () => {
    let meta = await MetaCoin.deployed();
    let metaCoinBalance = await getBalanceNumber(meta, accounts[0]);
    let metaCoinEthBalance = await getBalanceInEthNumber(meta, accounts[0]);

    assert.equal(
      metaCoinEthBalance,
      2 * metaCoinBalance,
      "Library function returned unexpected function, linkage may be broken"
    );
  });

  it("should send coin correctly", async () => {
    let meta;

    // Get initial balances of first and second account.
    let account_one = accounts[0];
    let account_two = accounts[1];

    let account_one_starting_balance;
    let account_two_starting_balance;
    let account_one_ending_balance;
    let account_two_ending_balance;

    let amount = 10;

    meta = await MetaCoin.deployed();

    account_one_starting_balance = await getBalanceNumber(meta, account_one);
    account_two_starting_balance = await getBalanceNumber(meta, account_two);

    await meta.sendCoin(account_two, amount, {from: account_one});

    account_one_ending_balance = await getBalanceNumber(meta, account_one);
    account_two_ending_balance = await getBalanceNumber(meta, account_two);

    assert.equal(
      account_one_ending_balance,
      account_one_starting_balance - amount,
      "Amount wasn't correctly taken from the sender");
    assert.equal(
      account_two_ending_balance,
      account_two_starting_balance + amount,
      "Amount wasn't correctly sent to the receiver");
  });
});
