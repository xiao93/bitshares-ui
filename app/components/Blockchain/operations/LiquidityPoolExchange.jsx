import React from "react";
import TranslateWithLinks from "../../Utility/TranslateWithLinks";
import {liquidityPoolExchangeSummary} from "common/operationNames";

export const LiquidityPoolExchange = ({op, result, changeColor}) => {
    const summary = liquidityPoolExchangeSummary(op, result);
    if (!summary) {
        return null;
    }
    if (changeColor) {
        changeColor("success");
    }

    return (
        <span>
            <TranslateWithLinks
                string={summary.stringKey}
                keys={[
                    {
                        type: "account",
                        value: summary.account,
                        arg: "account"
                    },
                    {
                        value: summary.pool,
                        arg: "id"
                    },
                    {
                        type: "amount",
                        value: summary.amountA,
                        arg: "amount_a"
                    },
                    {
                        type: "amount",
                        value: summary.amountB,
                        arg: "amount_b"
                    }
                ]}
            />
        </span>
    );
};
