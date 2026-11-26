import React from "react";
import TranslateWithLinks from "../../Utility/TranslateWithLinks";
import {liquidityPoolWithdrawSummary} from "common/operationNames";
import {LiquidityPoolFees} from "./LiquidityPoolFees";

export const LiquidityPoolWithdraw = ({op, result, changeColor}) => {
    const summary = liquidityPoolWithdrawSummary(op, result);
    if (!summary) {
        return null;
    }
    if (changeColor) {
        changeColor("warning");
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
