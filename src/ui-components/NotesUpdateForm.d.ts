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
export declare type NotesUpdateFormInputValues = {
    owner?: string;
    timestamp?: string;
    transcript?: string;
    note?: string;
};
export declare type NotesUpdateFormValidationValues = {
    owner?: ValidationFunction<string>;
    timestamp?: ValidationFunction<string>;
    transcript?: ValidationFunction<string>;
    note?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type NotesUpdateFormOverridesProps = {
    NotesUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    owner?: PrimitiveOverrideProps<TextFieldProps>;
    timestamp?: PrimitiveOverrideProps<TextFieldProps>;
    transcript?: PrimitiveOverrideProps<TextFieldProps>;
    note?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type NotesUpdateFormProps = React.PropsWithChildren<{
    overrides?: NotesUpdateFormOverridesProps | undefined | null;
} & {
    id?: {
        owner: string;
        timestamp: string;
    };
    notes?: any;
    onSubmit?: (fields: NotesUpdateFormInputValues) => NotesUpdateFormInputValues;
    onSuccess?: (fields: NotesUpdateFormInputValues) => void;
    onError?: (fields: NotesUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: NotesUpdateFormInputValues) => NotesUpdateFormInputValues;
    onValidate?: NotesUpdateFormValidationValues;
} & React.CSSProperties>;
export default function NotesUpdateForm(props: NotesUpdateFormProps): React.ReactElement;
