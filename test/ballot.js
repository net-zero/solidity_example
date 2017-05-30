const Ballot = artifacts.require('./Ballot.sol');

contract('Ballot', function(accounts) {
  const TEST_PROPOSALS = ['yennefer', 'triss', 'ciri', 'gwent'];

  function hexToAscii(hex) {
    hex = hex.slice(2);
    hex = hex.slice(0, hex.indexOf('0'))
    return Buffer.from(hex, 'hex').toString();
  }

  it('should register first account as chairperson with 1 weight', async () => {
    let ballot = await Ballot.deployed();
    let chairperson = await ballot.voters.call(accounts[0]);
    let weight = chairperson[0].toNumber();
    assert.equal(weight, 1, "chairperson's weight isn't 1");
  });

  it('should not give right to other accounts during intialization', async () => {
    let ballot = await Ballot.new(TEST_PROPOSALS);

    for (let i = 1; i < accounts.length; ++i) {
      let account = await ballot.voters.call(accounts[1]);
      let weight = account[0].toNumber();
      assert.equal(weight, 0, "other accounts's weight isn't 0");
    }
  });

  it('should initialize proposals with their voteCount to 0', async () => {
    let ballot = await Ballot.new(TEST_PROPOSALS);

    // We cannot get array from contract
    for (let i = 0; i < TEST_PROPOSALS.length; ++i) {
      let proposal = await ballot.proposals.call(i);
      assert.equal(hexToAscii(proposal[0]), TEST_PROPOSALS[i], 'name should be same');
      assert.equal(proposal[1].toNumber(), 0, 'voteCount should be 0');
    }
  });

  it('should give right to a vote only from chairperson ', async () => {
    let ballot = await Ballot.new(TEST_PROPOSALS);
    await ballot.giveRightToVote(accounts[1], {from: accounts[0]})

    let account_one = await ballot.voters.call(accounts[1]);
    let weight = account_one[0].toNumber();
    assert.equal(weight, 1, "default weight isn't 1");

    try {
      await ballot.giveRightToVote(accounts[1], {from: accounts[1]})
    } catch (err) {
      return;
    }
    throw new Error('should have thrown an error');
  });

  it('should not give right to a voter who already voted', async () => {
    let ballot = await Ballot.new(TEST_PROPOSALS);
    await ballot.giveRightToVote(accounts[1], {from: accounts[0]})
    await ballot.vote(0, {from: accounts[1]});

    try {
      await ballot.giveRightToVote(accounts[1], {from: accounts[1]})
    } catch (err) {
      return;
    }
    throw new Error('should have thrown an error');
  });

  it('should not vote a proposal without getting right first', async () => {
    let ballot = await Ballot.new(TEST_PROPOSALS);
    await ballot.vote(0, {from: accounts[1]});

    let proposal = await ballot.proposals.call(0);
    assert.equal(proposal[1].toNumber(), 0, 'voteCount should be 0');
  });

  it('should able to delegate to another voter', async () => {
    let ballot = await Ballot.new(TEST_PROPOSALS);
    let account_one = accounts[1];
    let account_two = accounts[2];

    await ballot.giveRightToVote(account_one, {from: accounts[0]});
    await ballot.giveRightToVote(account_two, {from: accounts[0]});

    await ballot.delegate(account_two, {from: account_one});
    let voter_account_two = await ballot.voters.call(account_two);
    let voter_account_one = await ballot.voters.call(account_one);

    assert.equal(voter_account_two[0].toNumber(), 2, 'weight should be 2');
    assert.isTrue(voter_account_one[1], 'voted should be true');
    assert.equal(voter_account_one[2], account_two, 'delegate should be account_two');
  });

  it('should able to delegate to another votered voter', async () => {
    let ballot = await Ballot.new(TEST_PROPOSALS);
    let account_one = accounts[1];
    let account_two = accounts[2];

    await ballot.giveRightToVote(account_one, {from: accounts[0]});
    await ballot.giveRightToVote(account_two, {from: accounts[0]});
    await ballot.vote(0, {from: account_two});

    await ballot.delegate(account_two, {from: account_one});
    let voter_account_two = await ballot.voters.call(account_two);
    let voter_account_one = await ballot.voters.call(account_one);
    let proposal = await ballot.proposals.call(0);

    assert.isTrue(voter_account_one[1], 'voted should be true');
    assert.equal(voter_account_one[2], account_two, 'delegate should be account_two');
    assert.equal(proposal[1].toNumber(), 2, 'voteCount should be 2');
  });

  it('should not able to delegate to self', async () => {
    let ballot = await Ballot.new(TEST_PROPOSALS);
    let account_one = accounts[1];

    await ballot.giveRightToVote(account_one, {from: accounts[0]});
    try {
      await ballot.delegate(account_one, {from: account_one});
    } catch (err) {
      return;
    }
    throw new Error('should have thrown an error');
  });

  it('should not able to do circle delegation', async () => {
    let ballot = await Ballot.new(TEST_PROPOSALS);
    let account_one = accounts[1];
    let account_two = accounts[2];

    await ballot.giveRightToVote(account_one, {from: accounts[0]});
    await ballot.giveRightToVote(account_two, {from: accounts[0]});
    await ballot.delegate(account_two, {from: account_one});
    try {
      await ballot.delegate(account_one, {from: account_two});
    } catch (err) {
      return;
    }
    throw new Error('should have thrown an error');
  });

  it('should not vote again', async () => {
    let ballot = await Ballot.new(TEST_PROPOSALS);
    let account_one = accounts[1];

    await ballot.giveRightToVote(account_one, {from: accounts[0]});
    await ballot.vote(0, {from: account_one});
    try {
      await ballot.vote(0, {from: account_one});
    } catch (err) {
      return;
    }
    throw new Error('should have thrown an error');
  });

  it('should give winning proposal', async () => {
    let ballot = await Ballot.new(TEST_PROPOSALS);

    for (let i = 1; i < 4; ++i) {
      await ballot.giveRightToVote(accounts[i], {from: accounts[0]});
    }
    await ballot.vote(0, {from: accounts[1]});
    await ballot.vote(1, {from: accounts[2]});
    await ballot.vote(1, {from: accounts[3]});

    let winningProposalNum = await ballot.winningProposal.call();
    assert.equal(winningProposalNum.toNumber(), 1, 'winning proposal should be #1');
  });

  it('should give winner name', async () => {
    let ballot = await Ballot.new(TEST_PROPOSALS);

    for (let i = 1; i < 4; ++i) {
      await ballot.giveRightToVote(accounts[i], {from: accounts[0]});
    }
    await ballot.vote(0, {from: accounts[1]});
    await ballot.vote(1, {from: accounts[2]});
    await ballot.vote(1, {from: accounts[3]});

    let winnerName = await ballot.winnerName.call();
    assert.equal(hexToAscii(winnerName.toString()), TEST_PROPOSALS[1], 'winner should be triss');
  });
});
