import React from "react";
import TranslateWithLinks from "../../Utility/TranslateWithLinks";
import {liquidityPoolDepositSummary} from "common/operationNames";
import {LiquidityPoolFees} from "./LiquidityPoolFees";

export const LiquidityPoolDeposit = ({op, result, changeColor}) => {
    const summary = liquidityPoolDepositSummary(op, result);
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
                keys={summary.keys}
            />
            <LiquidityPoolFees fees={summary.fees} />
        </span>
    );
};
