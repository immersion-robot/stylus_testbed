//! 배포된 `ContentPurchaseContract` 컨트랙트와 상호작용하는 테스트 클라이언트.
//! 
//! 사용법:
//!   cargo run --example test_client
//!
//! 환경 변수 필요 (.env 파일 또는 환경 변수):
//!   - PRIV_KEY: 개인 키 값 (hex 문자열, 0x 접두사 선택)
//!   - RPC_URL: Stylus RPC 엔드포인트 URL
//!   - STYLUS_CONTRACT_ADDRESS: 배포된 컨트랙트 주소

use dotenv::dotenv;
use ethers::{
    middleware::SignerMiddleware,
    prelude::abigen,
    providers::{Http, Middleware, Provider},
    signers::{LocalWallet, Signer},
    types::Address,
};
use eyre::eyre;
use std::str::FromStr;
use std::sync::Arc;

/// 개인 키 (파일 경로 또는 직접 값)
const PRIV_KEY: &str = "PRIV_KEY";

/// Stylus RPC 엔드포인트 URL
const RPC_URL: &str = "RPC_URL";

/// 배포된 프로그램 주소
const STYLUS_CONTRACT_ADDRESS: &str = "STYLUS_CONTRACT_ADDRESS";

#[tokio::main]
async fn main() -> eyre::Result<()> {
    dotenv().ok();
    let priv_key_value = std::env::var(PRIV_KEY)
        .map_err(|_| eyre!("No {} env var set", PRIV_KEY))?;
    let rpc_url = std::env::var(RPC_URL).map_err(|_| eyre!("No {} env var set", RPC_URL))?;
    let contract_address = std::env::var(STYLUS_CONTRACT_ADDRESS)
        .map_err(|_| eyre!("No {} env var set", STYLUS_CONTRACT_ADDRESS))?;

    abigen!(
        ContentPurchaseContract,
        r#"[
            function init() external
            function purchaseContent(uint64 contentType) external payable
            function hasPermission(address user, uint64 contentType) external view returns (bool)
            function getContentPrice(uint64 contentType) external view returns (uint256)
            function setContentPrice(uint64 contentType, uint256 price) external
            function balance() external view returns (uint256)
            function withdraw() external
        ]"#
    );

    let provider = Provider::<Http>::try_from(rpc_url)?;
    let address: Address = contract_address.parse()?;

    // 개인키 값을 직접 사용 (0x 접두사 제거)
    let privkey = priv_key_value.trim().trim_start_matches("0x");
    let wallet = LocalWallet::from_str(privkey)?;
    let chain_id = provider.get_chainid().await?.as_u64();
    let client = Arc::new(SignerMiddleware::new(
        provider,
        wallet.clone().with_chain_id(chain_id),
    ));

    let contract = ContentPurchaseContract::new(address, client);
    let my_address = wallet.address();

    println!("=== ContentPurchaseContract 테스트 시작 ===");
    println!("컨트랙트 주소: {:?}", address);
    println!("내 주소: {:?}\n", my_address);

    // 1. 컨트랙트 초기화
    println!("1. 컨트랙트 초기화 중...");
    let init_call = contract.init();
    let init_result = init_call.send().await;
    match init_result {
        Ok(pending) => {
            if let Some(receipt) = pending.await? {
                println!("초기화 성공! 트랜잭션 해시: {:?}\n", receipt.transaction_hash);
            } else {
                println!("초기화 트랜잭션 전송 완료\n");
            }
        }
        Err(e) => {
            println!("초기화 오류 (이미 초기화되었을 수 있음): {:?}\n", e);
        }
    }

    // 2. 콘텐츠 가격 조회
    println!("2. 콘텐츠 가격 조회...");
    for content_type in 1..=3 {
        let price_result = contract.get_content_price(content_type).call().await;
        match price_result {
            Ok(price) => {
                println!("  콘텐츠 타입 {} 가격: {} wei", content_type, price);
            }
            Err(e) => {
                println!("  콘텐츠 타입 {} 가격 조회 실패: {:?}", content_type, e);
            }
        }
    }
    println!();

    // 3. 콘텐츠 구매
    println!("3. 콘텐츠 구매 중...");
    let content_type = 1u64;
    let price_result = contract.get_content_price(content_type).call().await?;
    let price = price_result;
    println!("  구매할 콘텐츠 타입: {}", content_type);
    println!("  필요한 가격: {} wei", price);

    let purchase_call = contract
        .purchase_content(content_type)
        .value(price);
    let purchase_result = purchase_call.send().await;
    match purchase_result {
        Ok(pending) => {
            if let Some(receipt) = pending.await? {
                println!("  구매 성공! 트랜잭션 해시: {:?}", receipt.transaction_hash);
            } else {
                println!("  구매 트랜잭션 전송 완료");
            }
        }
        Err(e) => {
            println!("  구매 실패: {:?}", e);
            return Ok(());
        }
    }
    println!();

    // 4. 권한 확인
    println!("4. 권한 확인...");
    let permission_result = contract
        .has_permission(my_address, content_type)
        .call()
        .await;
    match permission_result {
        Ok(has_perm) => {
            println!(
                "  주소 {:?}의 콘텐츠 타입 {} 권한: {}",
                my_address, content_type, has_perm
            );
        }
        Err(e) => {
            println!("  권한 확인 실패: {:?}", e);
        }
    }
    println!();

    // 5. 컨트랙트 잔액 확인
    println!("5. 컨트랙트 잔액 확인...");
    let balance_result = contract.balance().call().await;
    match balance_result {
        Ok(balance) => {
            println!("  컨트랙트 현재 잔액: {} wei", balance);
        }
        Err(e) => {
            println!("  잔액 조회 실패: {:?}", e);
        }
    }
    println!();

    println!("=== 테스트 완료 ===");
    Ok(())
}

