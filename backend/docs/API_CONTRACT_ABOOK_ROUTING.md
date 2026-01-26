# A-Book/B-Book Trade Routing - API Contract

## Overview

This document defines the API contract between **Concordex** (Broker Platform) and **Corecen** (Liquidity Provider Platform) for A-Book trade routing.

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONCORDEX (Broker Platform)                        │
│                                                                              │
│  ┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐   │
│  │ Trade Open  │────▶│ Trade Router     │────▶│ Check User.bookType     │   │
│  │ (User/Admin)│     │ Service          │     │                         │   │
│  └─────────────┘     └──────────────────┘     └───────────┬─────────────┘   │
│                                                           │                  │
│                          ┌────────────────────────────────┼──────────┐       │
│                          │                                │          │       │
│                          ▼                                ▼          │       │
│                   ┌─────────────┐                  ┌─────────────┐   │       │
│                   │  A_BOOK     │                  │  B_BOOK     │   │       │
│                   │  (LP Route) │                  │  (Internal) │   │       │
│                   └──────┬──────┘                  └─────────────┘   │       │
│                          │                                           │       │
│                          │ 1. Set trade.bookType = 'A'               │       │
│                          │ 2. Set trade.lpSyncStatus = 'SYNCED'      │       │
│                          │ 3. Emit WebSocket: abook:trade:new        │       │
│                          ▼                                           │       │
│                   ┌─────────────────┐                                │       │
│                   │ External API    │◀───────────────────────────────┘       │
│                   │ /api/external/* │     (Corecen polls via REST)           │
│                   └────────┬────────┘                                        │
└────────────────────────────┼────────────────────────────────────────────────┘
                             │
                             │ HMAC-SHA256 Authenticated
                             │ REST API + WebSocket Events
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORECEN (Liquidity Provider)                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Broker Dashboard - Trades Section                │    │
│  │  ┌─────────┬─────────┬────────┬────────┬─────────┬────────────────┐ │    │
│  │  │Trade ID │ User    │ Symbol │ Side   │ Volume  │ Status         │ │    │
│  │  ├─────────┼─────────┼────────┼────────┼─────────┼────────────────┤ │    │
│  │  │T123456  │ demo    │ XAUUSD │ BUY    │ 0.01    │ ✓ OPEN         │ │    │
│  │  └─────────┴─────────┴────────┴────────┴─────────┴────────────────┘ │    │
│  │                        (Read-Only - No Actions)                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Changes

### Trade Model (Concordex)

```javascript
// New fields added to Trade schema
{
  // Book Type for trade routing (inherited from User.bookType at trade creation)
  bookType: {
    type: String,
    enum: ['A', 'B'],
    default: 'B'
  },
  
  // Broker ID for multi-broker support (future scalability)
  brokerId: {
    type: String,
    default: null
  },
  
  // Sync status for A-Book trades sent to LP
  lpSyncStatus: {
    type: String,
    enum: ['PENDING', 'SYNCED', 'FAILED', 'NOT_APPLICABLE'],
    default: 'NOT_APPLICABLE'
  },
  
  // Timestamp when trade was synced to LP
  lpSyncedAt: {
    type: Date,
    default: null
  }
}
```

### User Model (Concordex) - Existing

```javascript
{
  // Book Type (A Book = Liquidity Provider, B Book = Internal Management)
  bookType: {
    type: String,
    enum: ['A', 'B'],
    default: 'B'
  },
  bookChangedAt: {
    type: Date,
    default: null
  }
}
```

---

## API Endpoints

### Base URL
```
Concordex: http://localhost:5001
```

### Authentication

All external API endpoints require HMAC-SHA256 authentication.

**Required Headers:**
```
X-API-Key: <api_key>
X-Timestamp: <unix_timestamp_ms>
X-Signature: HMAC-SHA256(api_secret, timestamp + method + path + body)
```

**Default Credentials (Development):**
```
API_KEY: concordex_external_api_key
API_SECRET: concordex_external_api_secret
```

---

### 1. Get A-Book Trades

**Endpoint:** `GET /api/external/a-book/trades`

**Description:** Fetch all A-Book trades for display in Corecen.

**Query Parameters:**
| Parameter | Type   | Required | Description                          |
|-----------|--------|----------|--------------------------------------|
| status    | string | No       | Filter by status: `all`, `open`, `closed` |
| limit     | number | No       | Max results (default: 100)           |
| skip      | number | No       | Pagination offset (default: 0)       |
| brokerId  | string | No       | Filter by broker ID (future use)     |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "externalTradeId": "507f1f77bcf86cd799439011",
      "tradeId": "T1234567890",
      "symbol": "XAUUSD",
      "segment": "Metals",
      "side": "buy",
      "volume": 0.01,
      "openPrice": 2650.50,
      "closePrice": null,
      "currentPrice": 2652.30,
      "stopLoss": 2640.00,
      "takeProfit": 2680.00,
      "margin": 26.50,
      "leverage": 100,
      "commission": 0.50,
      "swap": 0,
      "pnl": 18.00,
      "status": "open",
      "closedBy": null,
      "openedAt": "2025-01-20T18:00:00.000Z",
      "closedAt": null,
      "user": {
        "id": "507f1f77bcf86cd799439012",
        "name": "Demo User",
        "email": "demo@example.com"
      },
      "accountId": "507f1f77bcf86cd799439013",
      "bookType": "A",
      "brokerId": "default"
    }
  ],
  "total": 25,
  "aBookUsers": 5,
  "limit": 100,
  "skip": 0
}
```

---

### 2. Get Single A-Book Trade

**Endpoint:** `GET /api/external/a-book/trade/:tradeId`

**Description:** Fetch a single A-Book trade by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "externalTradeId": "507f1f77bcf86cd799439011",
    "tradeId": "T1234567890",
    "symbol": "XAUUSD",
    "side": "buy",
    "volume": 0.01,
    "openPrice": 2650.50,
    "status": "open",
    "user": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Demo User",
      "email": "demo@example.com"
    }
  }
}
```

---

### 3. Get A-Book Users

**Endpoint:** `GET /api/external/a-book/users`

**Description:** Fetch all users assigned to A-Book.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Demo User",
      "email": "demo@example.com",
      "bookType": "A",
      "bookChangedAt": "2025-01-20T10:00:00.000Z",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 5
}
```

---

### 4. Get A-Book Statistics

**Endpoint:** `GET /api/external/a-book/stats`

**Description:** Get aggregated statistics for A-Book trades.

**Response:**
```json
{
  "success": true,
  "data": {
    "aBookUsers": 5,
    "openTrades": 12,
    "closedTrades": 45,
    "totalTrades": 57,
    "totalVolume": 15.50,
    "totalPnl": 1250.75,
    "totalCommission": 28.50
  }
}
```

---

### 5. Migrate Existing Trades

**Endpoint:** `POST /api/external/migrate`

**Description:** One-time migration to assign bookType to existing trades based on user's bookType.

**Response:**
```json
{
  "success": true,
  "message": "Migration completed",
  "migrated": 150
}
```

---

## WebSocket Events

### Event: `abook:trade:new`
Emitted when a new A-Book trade is opened.

```json
{
  "externalTradeId": "507f1f77bcf86cd799439011",
  "tradeId": "T1234567890",
  "symbol": "XAUUSD",
  "side": "buy",
  "volume": 0.01,
  "openPrice": 2650.50,
  "status": "open",
  "user": { "id": "...", "name": "Demo User", "email": "demo@example.com" }
}
```

### Event: `abook:trade:updated`
Emitted when an A-Book trade is modified (SL/TP change).

### Event: `abook:trade:closed`
Emitted when an A-Book trade is closed.

```json
{
  "externalTradeId": "507f1f77bcf86cd799439011",
  "tradeId": "T1234567890",
  "status": "closed",
  "closePrice": 2680.00,
  "pnl": 295.00,
  "closedBy": "take_profit",
  "closedAt": "2025-01-20T20:00:00.000Z"
}
```

---

## Status Mapping

### Trade Status
| Concordex | Corecen (LP) |
|-----------|--------------|
| OPEN      | open         |
| CLOSED    | closed       |
| PENDING   | pending      |
| CANCELLED | cancelled    |

### Closed By Reason
| Concordex | Corecen (LP) |
|-----------|--------------|
| SL        | stop_loss    |
| TP        | take_profit  |
| USER      | manual       |
| ADMIN     | admin        |
| STOP_OUT  | stop_out     |
| ALGO      | algo         |

---

## Trade Routing Logic

### On Trade Creation

```javascript
// 1. Get user's book type
const bookType = await getBookTypeForUser(trade.userId)

// 2. Set trade book type
trade.bookType = bookType

// 3. Route based on book type
if (bookType === 'A') {
  // A-Book: Send to LP
  trade.lpSyncStatus = 'SYNCED'
  trade.lpSyncedAt = new Date()
  // Emit WebSocket event
  io.emit('abook:trade:new', formatTradeForLP(trade))
} else {
  // B-Book: Internal only
  trade.lpSyncStatus = 'NOT_APPLICABLE'
}
```

### On Trade Close

```javascript
if (trade.bookType === 'A') {
  // Notify LP of trade closure
  io.emit('abook:trade:closed', formatTradeForLP(trade))
}
// B-Book trades are handled internally - no LP notification
```

---

## Multi-Broker Support (Future)

The `brokerId` field allows routing trades to specific brokers:

```javascript
// Future: Route to specific broker
if (trade.brokerId === 'broker_xyz') {
  // Send to Broker XYZ's endpoint
}
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

### HTTP Status Codes
| Code | Description                    |
|------|--------------------------------|
| 200  | Success                        |
| 400  | Bad Request                    |
| 401  | Unauthorized (HMAC auth failed)|
| 404  | Resource not found             |
| 500  | Internal server error          |

---

## Implementation Files

### Concordex Backend
- `models/Trade.js` - Trade schema with bookType, brokerId, lpSyncStatus
- `services/tradeRouter.js` - Trade routing service
- `services/tradeEngine.js` - Trade engine with routing integration
- `routes/externalApi.js` - External API endpoints for Corecen

### Corecen Frontend
- `pages/broker/TradesPage.tsx` - Displays A-Book trades (read-only)

---

## Testing

1. **Assign user to A-Book** in Concordex Admin → Book Management
2. **Create a trade** for that user
3. **Verify** trade appears in Corecen Broker Dashboard → Trades
4. **Close the trade** and verify status updates in Corecen
