interface BaseResult {
  readonly didSucceed: boolean;
}

export type FailureResult<Reason> = Reason extends undefined
  ? BaseResult & { readonly didSucceed: false }
  : BaseResult & { readonly didSucceed: false; readonly context: Reason };

export type SuccessfulResult<Result> = Result extends undefined
  ? BaseResult & { readonly didSucceed: true }
  : BaseResult & { readonly didSucceed: true; readonly result: Result };

export type Result<Type, FailureReason> =
  | FailureResult<FailureReason>
  | SuccessfulResult<Type>;
