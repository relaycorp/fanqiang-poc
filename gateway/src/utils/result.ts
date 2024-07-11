interface BaseResult {
  readonly didSucceed: boolean;
}

export type SuccessfulResult<Result> = Result extends undefined
  ? BaseResult & { readonly didSucceed: true }
  : BaseResult & { readonly didSucceed: true; readonly result: Result };

export type FailureResult<Context> = Context extends undefined
  ? BaseResult & { readonly didSucceed: false }
  : BaseResult & { readonly didSucceed: false; readonly context: Context };

export type Result<Type, FailureReason> =
  | FailureResult<FailureReason>
  | SuccessfulResult<Type>;
