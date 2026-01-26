# TradingView Pine Script Strategies

These Pine Script v5 strategies are designed for **Paper Trading** with webhook alerts to your backend.

## Available Strategies

### 1. Grid Trading Strategy (`grid_strategy.pine`)
- Automated grid trading with configurable grid levels
- ATR-based dynamic grid sizing option
- Basket take profit with `strategy.openprofit`
- Pyramiding support (up to 10 positions)

### 2. Basket TP/SL Strategy (`basket_tp_sl_strategy.pine`)
- EMA crossover + RSI entry signals
- Basket-level take profit and stop loss
- Trailing take profit activation
- Pyramiding on dips

### 3. Scalping Strategy (`scalping_strategy.pine`)
- Fast entry/exit for intraday trading
- Bollinger Bands + RSI + EMA signals
- Session filter (configurable trading hours)
- Trailing stop support

## Setup Instructions

### Step 1: Add Strategy to TradingView
1. Open TradingView and go to **Pine Editor**
2. Copy the strategy code from the `.pine` file
3. Click **Add to Chart**
4. Enable **Paper Trading** mode

### Step 2: Configure Webhook Alert
1. Right-click on the strategy → **Add Alert**
2. Set **Condition** to the strategy
3. Enable **Webhook URL** and enter:
   ```
   https://your-backend-url.com/api/tradingview/webhook
   ```
4. Set **Alert Message** (JSON format):

```json
{
  "secret": "YOUR_TRADINGVIEW_WEBHOOK_SECRET",
  "strategy_name": "{{strategy.order.id}}",
  "action": "{{strategy.order.action}}",
  "symbol": "{{ticker}}",
  "side": "{{strategy.order.action}}",
  "quantity": "{{strategy.order.contracts}}",
  "price": "{{close}}",
  "order_type": "MARKET",
  "comment": "{{strategy.order.comment}}",
  "position_size": "{{strategy.position_size}}"
}
```

### Step 3: Configure Backend
1. Set `TRADINGVIEW_WEBHOOK_SECRET` in your backend `.env` file
2. Use the same secret in your TradingView alert JSON
3. Restart the backend server

## Webhook Endpoint

**POST** `/api/tradingview/webhook`

### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| secret | string | Yes | Webhook validation secret |
| strategy_name | string | Yes | Name of the strategy |
| action | string | Yes | BUY, SELL, CLOSE, ALERT |
| symbol | string | Yes | Trading symbol (e.g., BTCUSD) |
| side | string | No | BUY or SELL |
| quantity | number | No | Position size |
| price | number | No | Execution price |
| order_type | string | No | MARKET, LIMIT, etc. |
| account_id | string | No | Target trading account |
| take_profit | number | No | TP price level |
| stop_loss | number | No | SL price level |
| comment | string | No | Additional info |

### Response
```json
{
  "success": true,
  "message": "Webhook received and processed",
  "signal_id": "SIG1234567890",
  "status": "RECEIVED"
}
```

## Signal Status Values
- `RECEIVED` - Signal received and logged
- `QUEUED` - Trade queued for execution
- `SIGNAL_ONLY` - No account_id provided, signal logged only
- `CLOSE_SIGNAL` - Close signal received
- `ALERT` - Alert notification
- `ERROR` - Processing error

## Real-Time Updates

All signals are emitted via Socket.IO:
- `tradingview_signal` - New signal received
- `trade_alert` - Alert notification
- `signal_processed` - Signal processing complete

## Testing

Use the test endpoint (no auth required):
```bash
curl -X POST https://your-backend/api/tradingview/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Security Notes
- Never commit your webhook secret to version control
- Use HTTPS in production
- The webhook validates the secret before processing
- Signals without valid secret are rejected with 401

## TradingView Limitations
- TradingView cannot connect via WebSocket
- All data comes via Alerts + Webhooks only
- Strategies use bar-based logic (not tick-based)
- Paper trading mode required for webhook execution
