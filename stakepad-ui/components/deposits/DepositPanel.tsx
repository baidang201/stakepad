import { AccountId, BalanceOf } from '@polkadot/types/interfaces'
import { } from '@polkadot/util'
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto/address'
import { Button } from 'baseui/button'
import { FormControl } from 'baseui/form-control'
import { Alert as AlertIcon, Check as CheckIcon } from 'baseui/icon'
import { Input } from 'baseui/input'
import { KIND as NotificationKind, Notification } from 'baseui/notification'
import { ALIGN as RadioGroupAlign, Radio, RadioGroup } from 'baseui/radio'
import BN from 'bn.js'
import React, { ReactElement, useMemo, useState } from 'react'
import { deposit, withdraw } from '../../libs/extrinsics/deposit'
import { useApiPromise, useWeb3 } from '../../libs/polkadot'
import { ExtrinsicStatus } from '../../libs/polkadot/extrinsics'
import { useAccountQuery } from '../../libs/queries/useAccountQuery'
import { useDepositQuery } from '../../libs/queries/useBalanceQuery'
import { AccountSelect } from '../accounts/AccountSelector'

// const LoadingSpinner = (): ReactElement => <StyledSpinnerNext $as="span" $size={SpinnerSize.small} />
const LoadingSpinner = (): ReactElement => <>Loading...</>

export const DepositPanel = (): ReactElement => {
    const [accountId, setAccountId] = useState<AccountId>()
    const [amount, setAmount] = useState<number>()
    const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit')
    const [extrinsicStatus, setExtrinsicStatus] = useState<ExtrinsicStatus>()

    const { data: accountInfo } = useAccountQuery(accountId)
    const { data: depositBalance } = useDepositQuery(accountId)
    const { api, readystate: apiReadystate } = useApiPromise()
    const { readystate: web3Readystate } = useWeb3()

    const accountSelectCaption = useMemo(() => {
        switch (accountId !== undefined && mode) {
            case 'deposit':
                return <>钱包余额: {accountInfo?.data.free.toHuman() ?? <LoadingSpinner />}</>
            case 'withdraw':
                return <>挖矿储值: {depositBalance?.toHuman() ?? <LoadingSpinner />}</>
            default:
                return <>选择一个账户</>
        }
    }, [accountId, accountInfo?.data.free, depositBalance, mode])

    const extrinsicStatusIndicator = useMemo(() => {
        switch (extrinsicStatus) {
            case undefined:
                return <></>
            case 'localSign':
                return <Notification kind={NotificationKind.warning}><LoadingSpinner /> 等待浏览器扩展签名</Notification>
            case 'broadcast':
                return <Notification kind={NotificationKind.info}><LoadingSpinner /> Broadcasting</Notification>
            case 'inBlock':
                return <Notification kind={NotificationKind.info}><LoadingSpinner /> In block</Notification>
            case 'finalized':
                return <Notification kind={NotificationKind.positive}><CheckIcon /> Finalized</Notification>
            default:
                return <Notification kind={NotificationKind.negative}><AlertIcon /> Extrinsic 失败或异常</Notification>
        }
    }, [extrinsicStatus])

    const ready = useMemo(() => (
        accountId !== undefined &&
        typeof amount === 'number' &&
        apiReadystate === 'ready' &&
        web3Readystate === 'ready'
    ), [accountId, amount, apiReadystate, web3Readystate])

    const handleAmountChange = (newValue: string): void => {
        setAmount(/^\d+(\.\d{0,4})?$/.test(newValue) ? parseFloat(newValue) : undefined)
    }

    const handleSubmit = (): void => {
        if (accountId === undefined || amount === undefined || api === undefined) { return }

        ({ deposit, withdraw })[mode]({
            account: encodeAddress(accountId),
            api,
            statusCallback: (status: ExtrinsicStatus) => {
                console.log('extrinsic status=', status)
                setExtrinsicStatus(status)
            },
            value: new BN(amount * 1e4).mul(new BN(1e8)) as BalanceOf
        }).catch(error => { throw error })
    }

    return (
        <>
            <AccountSelect
                caption={accountSelectCaption}
                error={accountId === undefined}
                label="Stash Account"
                onChange={address => setAccountId(address === undefined ? undefined : decodeAddress(address) as AccountId)}
            />

            <RadioGroup align={RadioGroupAlign.horizontal} onChange={e => setMode(e.target.value as any)} value={mode}>
                <Radio value="deposit">存入</Radio>
                <Radio value="withdraw">取出</Radio>
            </RadioGroup>

            <FormControl>
                <Input
                    error={amount === undefined}
                    endEnhancer={() => <span>PHA</span>}
                    onChange={e => handleAmountChange(e.currentTarget.value)}
                />
            </FormControl>

            <Button disabled={!ready} onClick={() => handleSubmit()} startEnhancer={<CheckIcon />}>提交</Button>

            {extrinsicStatusIndicator}

            {apiReadystate !== 'ready' && <Notification kind={NotificationKind.negative}>Waiting for connection to Phala network</Notification>}
            {web3Readystate !== 'ready' && <Notification kind={NotificationKind.negative}>Waiting for Polkadot.js browser extension</Notification>}
        </>
    )
}
