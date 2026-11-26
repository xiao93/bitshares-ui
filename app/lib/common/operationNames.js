/**
 * Operation id 63 is liquidity_pool_exchange.
 *
 * The bitsharesjs revision pinned by this UI (ChainTypes.operations) stops at
 * ticket_update (58). Block and history views resolve a numeric operation id
 * with Object.keys(ChainTypes.operations)[id], so id 63 never matches a
 * renderer and the block page dumps the raw operation. Names are filled in by
 * id, which keeps 0..58 stable and does not depend on key insertion order.
 */

export const LIQUIDITY_POOL_EXCHANGE_ID = 63;

const OPERATION_NAMES_BY_ID = {
    63: "liquidity_pool_exchange"
};

function isAsset(value) {
    return !!value && value.amount != null && typeof value.asset_id === "string";
}

export function buildOperationNames(baseNames) {
    const names = baseNames.slice();
    Object.keys(OPERATION_NAMES_BY_ID).forEach(key => {
        const index = parseInt(key, 10);
        if (names[index] == null) {
            names[index] = OPERATION_NAMES_BY_ID[index];
        }
    });
    return names;
}

/**
 * Read a liquidity_pool_exchange operation.
 *
 * `op` is the [id, body] pair returned by get_block. `result`, when present,
 * is an operation result. Account history stores a
 * generic_exchange_operation_result as:
 *   [4, {paid: [asset], received: [asset], fees: [asset, asset, asset]}]
 * get_block on current public nodes leaves operation_results empty, so the
 * block view has to render amount_to_sell and min_to_receive from the body.
 */
export function describeLiquidityPoolExchange(op, result) {
    if (!op || op[0] !== LIQUIDITY_POOL_EXCHANGE_ID || !op[1]) {
        return null;
    }

    const body = op[1];
    if (
        typeof body.account !== "string" ||
        typeof body.pool !== "string" ||
        !isAsset(body.amount_to_sell) ||
        !isAsset(body.min_to_receive)
    ) {
        return null;
    }

    const described = {
        account: body.account,
        pool: body.pool,
        amountToSell: body.amount_to_sell,
        minToReceive: body.min_to_receive,
        fee: isAsset(body.fee) ? body.fee : null,
        paid: null,
        received: null,
        fees: null
    };

    const payload = Array.isArray(result) ? result[1] : null;
    if (payload && Array.isArray(payload.paid) && isAsset(payload.paid[0])) {
        described.paid = payload.paid[0];
    }
    if (
        payload &&
        Array.isArray(payload.received) &&
        isAsset(payload.received[0])
    ) {
        described.received = payload.received[0];
    }
    if (payload && Array.isArray(payload.fees)) {
        described.fees = payload.fees.filter(isAsset);
    }

    return described;
}

export function liquidityPoolExchangeSummary(op, result) {
    const view = describeLiquidityPoolExchange(op, result);
    if (!view) {
        return null;
    }

    const actual = view.paid && view.received;
    return {
        stringKey: actual
            ? "operation.liquidity_pool_exchange"
            : "operation.liquidity_pool_exchange_limit",
        account: view.account,
        pool: view.pool,
        amountA: actual ? view.paid : view.amountToSell,
        amountB: actual ? view.received : view.minToReceive,
        view
    };
}

/**
 * Rows for the block / transaction table. Labels are locale keys.
 * Price uses the same base/quote orientation as limit_order_create.
 */
export function liquidityPoolExchangeRows(op, result) {
    const view = describeLiquidityPoolExchange(op, result);
    if (!view) {
        return null;
    }

    const rows = [
        {label: "header.account", kind: "account", value: view.account},
        {
            label: "explorer.block.liquidity_pool",
            kind: "text",
            value: view.pool
        },
        {label: "exchange.sell", kind: "amount", value: view.amountToSell},
        {
            label: "transaction.min_receive",
            kind: "amount",
            value: view.minToReceive
        },
        {
            label: "exchange.price",
            kind: "price",
            base: view.amountToSell,
            quote: view.minToReceive
        }
    ];

    if (view.paid) {
        rows.push({
            label: "explorer.block.amount_paid",
            kind: "amount",
            value: view.paid
        });
    }
    if (view.received) {
        rows.push({
            label: "explorer.block.amount_received",
            kind: "amount",
            value: view.received
        });
    }

    return rows;
}
