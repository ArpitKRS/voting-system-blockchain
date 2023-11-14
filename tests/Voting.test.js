const {ethers} = require("hardhat");
const {expect} = require("chai");

describe("Ballot Contract", function () {
    let Ballot, ballot, owner, voter1, voter2

    beforeEach(async function () {
        [owner, voter1, voter2] = await ethers.getSigners()
        Ballot = await ethers.getContract("Ballot", owner)
        ballot = await Ballot.deploy("Official", "Proposal")
        await ballot.deployed()

        // Add voters
        await ballot.addVoter(voter1.address, "Voter1")
        await ballot.addVoter(voter2.address, "Voter2")
    })

    it("should have correct initial state", async() => {
        expect(await ballot.ballotOfficialAddress()).to.equal(owner.address)
        expect(await ballot.ballotOfficialName()).to.equal("Official")
        expect(await ballot.proposal()).to.equal("Proposal")
        expect(await ballot.state()).to.equal(0)
    })

    it("should add voters correctly", async() => {
        const voter1Info = await ballot.voterRegister(voter1.address)
        const voter2Info = await ballot.voterRegister(voter2.address)

        expect(voter1Info.voterName).to.equal("Voter1")
        expect(voter2Info.voterName).to.equal("Voter2")
        expect(voter1Info.voted).to.equal(false)
        expect(voter2Info.voted).to.equal(false)
        expect(await ballot.totalVoters()).to.equal(2)
    })

    it("should start and end voting correctly", async() => {
        await ballot.startVote()
        expect(await ballot.state()).to.equal(1)

        await ballot.endVote()
        expect(await ballot.state()).to.equal(2)
    })

    it("should allows voters to cast vote", async() => {
        await ballot.startVote()

        // Voter 1 cast vote
        const voteTx1 = await ballot.connect(voter1).doVote(true)
        expect(voteTx1).to.emit(ballot, "VoteCast").withArgs(voter1.address, true)

        // Voter 2 cast vote
        const voteTx2 = await ballot.connect(voter2).doVote(false)
        expect(voteTx2).to.emit(ballot, "VoteCast").withArgs(voter2.address, false)

        expect(await ballot.totalVote()).to.equal(2)
        expect(await ballot.finalResult()).to.equal(1)
        expect(await ballot.voterRegister(voter1.address)).to.include({voted: true})
        expect(await ballot.voterRegister(voter2.address)).to.include({voted: true})
    })

    it("should not allow double voting", async() => {
        await ballot.startVote()

        // Voter 1 cast vote
        await ballot.connect(voter1).doVote(true)
        // Voter tries to vote again
        await expect(ballot.connect(voter1).doVote(false)).to.be.revertedWith("Voter has already voted")
        // Final result should still be 1
        expect(await ballot.totalVote()).to.equal(1)
        expect(await ballot.finalResult()).to.equal(1)
    })

    it("should not allow voting in the wrong state", async() => {
        await expect(ballot.connect(voter1).doVote(true)).to.be.revertedWith("Voting has not started yet")

        await ballot.startVote()
        await ballot.endVote()

        await expect(ballot.connect(voter1).doVote(true)).to.be.revertedWith("Voting has not started yet")
    })
})