# Turtle DAO Solana Program

This is the Solana program for the Turtle DAO platform, an incentive-driven community platform on the Solana blockchain.

## Overview

The Turtle DAO program implements a time-based bounty system where:

1. Depositors fund bounties with SOL
2. Challengers (content creators) compete to win rewards
3. The last content producer before a time limit expires wins the bounty
4. A portion of deposits is reserved for high-quality content creators

## Features

- Time-based reward mechanism (reward goes to last content creator when time expires)
- Community governance via voting (proportional to deposit amount)
- Configurable parameters:
  - Time limit
  - Base fee (to prevent spam)
  - AI content moderation toggle
  - Deposit share percentage for quality content
- Depositor locking period (1 week)

## Program Instructions

1. `InitializeDao` - Create a new DAO with initial parameters
2. `SubmitContent` - Submit content to the community (resets timer)
3. `Deposit` - Deposit SOL to the bounty pool
4. `ClaimReward` - Claim reward as the last content submitter after time limit
5. `CreateVote` - Create a governance proposal
6. `Vote` - Vote on a governance proposal
7. `DistributeQualityRewards` - Distribute rewards to high-quality content creators

## Account Structure

- `DaoState` - Stores DAO parameters and state
- `Content` - Stores content metadata and author information
- `Depositor` - Stores depositor information and voting power
- `Proposal` - Stores governance proposal details and votes

## Building and Testing

```bash
# Build the program
cargo build-spf
```

## Integration with Frontend

The frontend can interact with this program using the provided instruction helpers in the `instruction.rs` file.

## License

MIT