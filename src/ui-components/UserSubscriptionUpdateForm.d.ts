/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
export declare type EscapeHatchProps = {
    [elementHierarchy: string]: Record<string, unknown>;
} | null;
export declare type VariantValues = {
    [key: string]: string;
};
export declare type Variant = {
    variantValues: VariantValues;
    overrides: EscapeHatchProps;
};
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type UserSubscriptionUpdateFormInputValues = {
    owner?: string;
    tier?: string;
    hoursleft?: number;
    notesleft?: number;
};
export declare type UserSubscriptionUpdateFormValidationValues = {
    owner?: ValidationFunction<string>;
    tier?: ValidationFunction<string>;
    hoursleft?: ValidationFunction<number>;
    notesleft?: ValidationFunction<number>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type UserSubscriptionUpdateFormOverridesProps = {
    UserSubscriptionUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    owner?: PrimitiveOverrideProps<TextFieldProps>;
    tier?: PrimitiveOverrideProps<TextFieldProps>;
    hoursleft?: PrimitiveOverrideProps<TextFieldProps>;
    notesleft?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type UserSubscriptionUpdateFormProps = React.PropsWithChildren<{
    overrides?: UserSubscriptionUpdateFormOverridesProps | undefined | null;
} & {
    owner?: string;
    userSubscription?: any;
    onSubmit?: (fields: UserSubscriptionUpdateFormInputValues) => UserSubscriptionUpdateFormInputValues;
    onSuccess?: (fields: UserSubscriptionUpdateFormInputValues) => void;
    onError?: (fields: UserSubscriptionUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: UserSubscriptionUpdateFormInputValues) => UserSubscriptionUpdateFormInputValues;
    onValidate?: UserSubscriptionUpdateFormValidationValues;
} & React.CSSProperties>;
export default function UserSubscriptionUpdateForm(props: UserSubscriptionUpdateFormProps): React.ReactElement;
