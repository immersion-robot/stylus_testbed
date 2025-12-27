//! 배포된 Mock ERC-20 토큰 컨트랙트와 상호작용하는 테스트 클라이언트.
//! 
//! 사용법:
//!   cargo run --example test_erc20
//!
//! 환경 변수 필요 (.env 파일 또는 환경 변수):
//!   - PRIV_KEY: 개인 키 값 (hex 문자열, 0x 접두사 선택)
//!   - RPC_URL: Stylus RPC 엔드포인트 URL
//!   - ERC20_CONTRACT_ADDRESS: 배포된 ERC-20 컨트랙트 주소

use dotenv::dotenv;
use ethers::{
    middleware::SignerMiddleware,
    prelude::abigen,
    providers::{Http, Middleware, Provider},
    signers::{LocalWallet, Signer},
    types::{Address, U256},
};
use eyre::eyre;
use std::str::FromStr;
use std::sync::Arc;

/// 개인 키
const PRIV_KEY: &str = "PRIV_KEY";

/// Stylus RPC 엔드포인트 URL
const RPC_URL: &str = "RPC_URL";

/// 배포된 ERC-20 컨트랙트 주소
const ERC20_CONTRACT_ADDRESS: &str = "ERC20_CONTRACT_ADDRESS";

#[tokio::main]
async fn main() -> eyre::Result<()> {
    dotenv().ok();
    let priv_key_value = std::env::var(PRIV_KEY)
        .map_err(|_| eyre!("No {} env var set", PRIV_KEY))?;
    let rpc_url = std::env::var(RPC_URL).map_err(|_| eyre!("No {} env var set", RPC_URL))?;
    let contract_address = std::env::var(ERC20_CONTRACT_ADDRESS)
        .map_err(|_| eyre!("No {} env var set", ERC20_CONTRACT_ADDRESS))?;

    abigen!(
        MockERC20,
        r#"[
            function totalSupply() external view returns (uint256)
            function balanceOf(address owner) external view returns (uint256)
            function transfer(address to, uint256 amount) external returns (bool)
            function approve(address spender, uint256 amount) external returns (bool)
            function allowance(address owner, address spender) external view returns (uint256)
            function transferFrom(address from, address to, uint256 amount) external returns (bool)
            function mint(address to, uint256 amount) external
        ]"#
    );

    let provider = Provider::<Http>::try_from(rpc_url)?;
    let address: Address = contract_address.parse()?;
    let privkey = priv_key_value.trim().trim_start_matches("0x");
    let wallet = LocalWallet::from_str(privkey)?;
    let chain_id = provider.get_chainid().await?.as_u64();
    let client = Arc::new(SignerMiddleware::new(
        provider,
        wallet.clone().with_chain_id(chain_id),
    ));

    let my_address = wallet.address();

    println!("=== Mock ERC-20 토큰 테스트 시작 ===");
    println!("컨트랙트 주소: {:?}", address);
    println!("내 주소: {:?}\n", my_address);

    // 0. 컨트랙트 코드 존재 확인
    println!("0. 컨트랙트 코드 확인 중...");
    let code = client.get_code(address, None).await?;
    if code.is_empty() {
        println!("  경고: 컨트랙트 주소에 코드가 없습니다. 컨트랙트가 배포되고 활성화되었는지 확인하세요.\n");
    } else {
        println!("  컨트랙트 코드 존재 확인됨 (크기: {} bytes)\n", code.len());
    }

    let contract = MockERC20::new(address, client);

    // 1. 내 주소로 토큰 mint
    println!("1. 내 주소로 토큰 mint 중...");
    let mint_amount = U256::from(1000) * U256::from(10).pow(U256::from(6)); // 1000 * 10^6
    let mint_call = contract.mint(my_address, mint_amount);
    let mint_result = mint_call.send().await;
    match mint_result {
        Ok(pending) => {
            if let Some(receipt) = pending.await? {
                println!("Mint 성공! 트랜잭션 해시: {:?}\n", receipt.transaction_hash);
                // 트랜잭션이 블록에 포함될 때까지 잠시 대기
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            } else {
                println!("Mint 트랜잭션 전송 완료\n");
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            }
        }
        Err(e) => {
            println!("Mint 실패: {:?}\n", e);
        }
    }

    // 2. 총 공급량 조회
    println!("2. 총 공급량 조회...");
    let total_supply_result = contract.total_supply().call().await;
    match total_supply_result {
        Ok(supply) => {
            println!("  총 공급량: {}\n", supply);
        }
        Err(e) => {
            println!("  총 공급량 조회 실패: {:?}\n", e);
            println!("  참고: 컨트랙트가 활성화되지 않았거나 초기화가 완료되지 않았을 수 있습니다.\n");
        }
    }

    // 3. 내 잔액 조회
    println!("3. 내 잔액 조회...");
    let balance_result = contract.balance_of(my_address).call().await;
    match balance_result {
        Ok(balance) => {
            println!("  내 잔액: {}\n", balance);
        }
        Err(e) => {
            println!("  잔액 조회 실패: {:?}\n", e);
            println!("  참고: 컨트랙트가 활성화되지 않았거나 초기화가 완료되지 않았을 수 있습니다.\n");
        }
    }

    // 4. 토큰 전송 테스트 (나에게)
    println!("4. 토큰 전송 테스트 (같은 주소로 1000 tokens)...");
    let transfer_amount = U256::from(1);
    let transfer_call = contract.transfer(my_address, transfer_amount);
    let transfer_result = transfer_call.send().await;
    match transfer_result {
        Ok(pending) => {
            if let Some(receipt) = pending.await? {
                println!("  전송 성공! 트랜잭션 해시: {:?}\n", receipt.transaction_hash);
            } else {
                println!("  전송 트랜잭션 전송 완료\n");
            }
        }
        Err(e) => {
            println!("  전송 실패: {:?}\n", e);
        }
    }

    // 5. 최종 잔액 확인
    println!("5. 최종 잔액 확인...");
    // 전송 후 상태가 반영될 때까지 잠시 대기
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    let final_balance_result = contract.balance_of(my_address).call().await;
    match final_balance_result {
        Ok(balance) => {
            println!("  최종 잔액: {}\n", balance);
        }
        Err(e) => {
            println!("  잔액 조회 실패: {:?}\n", e);
            println!("  참고: 컨트랙트가 활성화되지 않았거나 초기화가 완료되지 않았을 수 있습니다.\n");
        }
    }

    println!("=== 테스트 완료 ===");
    Ok(())
}


