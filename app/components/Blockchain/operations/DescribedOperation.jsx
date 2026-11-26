import React from "react";
import counterpart from "counterpart";
import TranslateWithLinks from "../../Utility/TranslateWithLinks";
import {
    historyOperationSummary,
    localizeDescribedOperation
} from "common/operationDetails";

function translateDuration(key, params) {
    return counterpart.translate(key, params);
}

export const DescribedOperation = ({op, view, changeColor}) => {
    const resolved = localizeDescribedOperation(
        view || historyOperationSummary(op),
        translateDuration
    );
    if (!resolved || !resolved.summary) {
        return null;
    }
    if (changeColor) {
        changeColor(resolved.color || "info");
    }

    const parts = [resolved.summary].concat(resolved.summary.clauses || []);
    return (
        <span>
            {parts.map((part, index) => (
                <React.Fragment key={part.stringKey + "-" + index}>
                    {index > 0 ? ", " : null}
                    <TranslateWithLinks
                        string={part.stringKey}
                        keys={part.keys || []}
                        params={part.params}
                    />
                </React.Fragment>
            ))}
        </span>
    );
};
