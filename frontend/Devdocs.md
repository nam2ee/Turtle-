# Bounty Market DevDocs

This document outlines the API endpoints and smart contract interactions required for the Bounty Market frontend.

## Smart Contract Interactions

### Wallet Connection
- **Network**: Solana Devnet (`clusterApiUrl("devnet")`)
- **Supported Wallets**: Phantom, Solflare

### Community Contract

#### Create Community
- **Function**: `createCommunity(name, description, bountyAmount, timeLimit, baseFee)`
- **Parameters**:
  - `name`: String - Community name
  - `description`: String - Community description
  - `bountyAmount`: Number - Initial bounty amount in SOL
  - `timeLimit`: Number - Time limit in minutes
  - `baseFee`: Number - Base fee for posting in SOL
- **Returns**: Community ID

#### Deposit to Community
- **Function**: `depositToCommunity(communityId, amount)`
- **Parameters**:
  - `communityId`: String - ID of the community
  - `amount`: Number - Amount to deposit in SOL
- **Returns**: Transaction hash

#### Submit Post
- **Function**: `submitPost(communityId, content)`
- **Parameters**:
  - `communityId`: String - ID of the community
  - `content`: String - Post content
- **Returns**: Post ID and transaction hash

#### Like Post
- **Function**: `likePost(postId)`
- **Parameters**:
  - `postId`: String - ID of the post
- **Returns**: Updated like count

#### Award Bounty
- **Function**: `awardBounty(communityId, postId)`
- **Parameters**:
  - `communityId`: String - ID of the community
  - `postId`: String - ID of the winning post
- **Returns**: Transaction hash

## Backend API Endpoints

### Communities

#### List Communities
- **Endpoint**: `GET /api/communities`
- **Query Parameters**:
  - `sort`: String - Sort option (recent, bounty, popularity)
  - `search`: String - Search query
  - `page`: Number - Page number
  - `limit`: Number - Communities per page
- **Response**:
  ```json
  {
    "communities": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "bountyAmount": "number",
        "gradient": "string",
        "timeLimit": "number",
        "baseFee": "number",
        "createdAt": "string",
        "popularity": "number",
        "depositors": "number",
        "challengers": "number",
        "lastActivityTime": "string"
      }
    ],
    "totalCount": "number"
  }
  ```

#### Get Community Details
- **Endpoint**: `GET /api/communities/:id`
- **Response**:
  ```json
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "bountyAmount": "number",
    "gradient": "string",
    "timeLimit": "number",
    "baseFee": "number",
    "depositors": "number",
    "challengers": "number",
    "lastActivityTime": "string",
    "createdAt": "string",
    "popularity": "number"
  }
  ```

#### Create Community
- **Endpoint**: `POST /api/communities`
- **Request Body**:
  ```json
  {
    "name": "string",
    "description": "string",
    "bountyAmount": "number",
    "timeLimit": "number",
    "baseFee": "number",
    "socialLinks": {
      "github": "string",
      "twitter": "string",
      "telegram": "string"
    },
    "profileImage": "string"
  }
  ```
- **Response**: Created community object

### Posts

#### List Community Posts
- **Endpoint**: `GET /api/communities/:id/posts`
- **Response**:
  ```json
  {
    "posts": [
      {
        "id": "string",
        "communityId": "string",
        "author": "string",
        "content": "string",
        "timestamp": "string",
        "likes": "number",
        "likedBy": ["string"]
      }
    ]
  }
  ```

#### Create Post
- **Endpoint**: `POST /api/communities/:id/posts`
- **Request Body**:
  ```json
  {
    "content": "string"
  }
  ```
- **Response**: Created post object with transaction details

#### Get Post
- **Endpoint**: `GET /api/posts/:id`
- **Response**: Post object

#### Like/Unlike Post
- **Endpoint**: `PUT /api/posts/:id/like`
- **Response**:
  ```json
  {
    "id": "string",
    "likes": "number",
    "likedBy": ["string"]
  }
  ```

### User

#### Get User Profile
- **Endpoint**: `GET /api/profile`
- **Response**:
  ```json
  {
    "walletAddress": "string",
    "username": "string",
    "avatar": "string",
    "joinedAt": "string"
  }
  ```

#### Update User Profile
- **Endpoint**: `PUT /api/profile`
- **Request Body**:
  ```json
  {
    "username": "string",
    "avatar": "string"
  }
  ```
- **Response**: Updated profile object

#### Get Joined Communities
- **Endpoint**: `GET /api/user/joined-communities`
- **Response**:
  ```json
  {
    "communities": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "bountyAmount": "number",
        "timeLimit": "string",
        "baseFee": "number"
      }
    ]
  }
  ```

## Integration Points

The following components in the frontend need to be connected to these endpoints:

1. `WalletContextProvider.tsx` - Configures wallet connection
2. `app/page.tsx` - Fetches communities list, handles community creation
3. `app/community/[id]/page.tsx` - Fetches community details and posts, handles post submission
4. `CreateCommunityModal.tsx` - Handles community creation form submission
5. `CommunityCard.tsx` - Handles deposit to community functionality
6. `PostDetailModal.tsx` - Handles post interaction (likes)
7. `CountdownTimer.tsx` - Tracks time remaining and triggers bounty award