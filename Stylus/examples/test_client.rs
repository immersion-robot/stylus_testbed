//! 배포된 `ContentPurchaseContract` 컨트랙트와 상호작용하는 테스트 클라이언트.
//! 
//! 사용법:
//!   cargo run --example test_client
//!
//! 환경 변수 필요 (.env 파일 또는 환경 변수):
//!   - PRIV_KEY: 개인 키 값 (hex 문자열, 0x 접두사 선택)
//!   - RPC_URL: Stylus RPC 엔드포인트 URL
//!   - STYLUS_CONTRACT_ADDRESS: 배포된 컨트랙트 주소
//!   - ERC20_CONTRACT_ADDRESS: ERC20 토큰 컨트랙트 주소 (USDT)

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

/// ERC20 토큰 컨트랙트 주소
const ERC20_CONTRACT_ADDRESS: &str = "ERC20_CONTRACT_ADDRESS";

#[tokio::main]
async fn main() -> eyre::Result<()> {
    dotenv().ok();
    let priv_key_value = std::env::var(PRIV_KEY)
        .map_err(|_| eyre!("No {} env var set", PRIV_KEY))?;
    let rpc_url = std::env::var(RPC_URL).map_err(|_| eyre!("No {} env var set", RPC_URL))?;
    let contract_address = std::env::var(STYLUS_CONTRACT_ADDRESS)
        .map_err(|_| eyre!("No {} env var set", STYLUS_CONTRACT_ADDRESS))?;
    let erc20_address = std::env::var(ERC20_CONTRACT_ADDRESS)
        .map_err(|_| eyre!("No {} env var set", ERC20_CONTRACT_ADDRESS))?;

    abigen!(
        ContentPurchaseContract,
        r#"[
            function init(address tokenAddress) external
            function purchaseContent(uint64 contentType) external
            function hasPermission(address user, uint64 contentType) external view returns (bool)
            function getContentPrice(uint64 contentType) external view returns (uint256)
            function setContentPrice(uint64 contentType, uint256 price) external
            function balance() external view returns (uint256)
            function withdraw() external
        ]"#
    );

    abigen!(
        IERC20,
        r#"[
            function approve(address spender, uint256 amount) external returns (bool)
            function allowance(address owner, address spender) external view returns (uint256)
            function balanceOf(address account) external view returns (uint256)
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

    let contract = ContentPurchaseContract::new(address, Arc::clone(&client));
    let my_address = wallet.address();
    let erc20_addr: Address = erc20_address.parse()?;

    println!("=== ContentPurchaseContract 테스트 시작 ===");
    println!("컨트랙트 주소: {:?}", address);
    println!("ERC20 토큰 주소: {:?}", erc20_addr);
    println!("내 주소: {:?}\n", my_address);

    // 1. 컨트랙트 초기화
    println!("1. 컨트랙트 초기화 중...");
    let init_call = contract.init(erc20_addr);
    let init_result = init_call.send().await;
    match init_result {
        Ok(pending) => {
            if let Some(receipt) = pending.await? {
                println!("  ✓ 초기화 성공! 트랜잭션 해시: {:?}\n", receipt.transaction_hash);
            } else {
                println!("  ✓ 초기화 트랜잭션 전송 완료\n");
            }
        }
        Err(e) => {
            println!("  ⚠ 초기화 오류 (이미 초기화되었을 수 있음): {:?}\n", e);
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

    // 3. ERC20 토큰 approve
    println!("3. ERC20 토큰 approve 중...");
    let erc20_contract = IERC20::new(erc20_addr, Arc::clone(&client));
    
    // 현재 allowance 확인
    let allowance_result = erc20_contract
        .allowance(my_address, address)
        .call()
        .await?;
    let current_allowance = allowance_result;
    println!("  현재 allowance: {}", current_allowance);
    
    // 필요한 가격 확인
    let content_type = 1u64;
    let price_result = contract.get_content_price(content_type).call().await?;
    let price = price_result;
    println!("  필요한 가격: {}", price);
    
    // allowance가 부족하면 approve 실행
    if current_allowance < price {
        println!("  allowance가 부족합니다. approve 실행 중...");
        let approve_call = erc20_contract.approve(address, price);
        let approve_result = approve_call.send().await;
        match approve_result {
            Ok(pending) => {
                if let Some(receipt) = pending.await? {
                    println!("  ✓ approve 성공! 트랜잭션 해시: {:?}", receipt.transaction_hash);
                } else {
                    println!("  ✓ approve 트랜잭션 전송 완료");
                }
            }
            Err(e) => {
                println!("  ✗ approve 실패: {:?}", e);
                return Ok(());
            }
        }
    } else {
        println!("  ✓ allowance가 충분합니다.");
    }
    println!();

    // 4. 콘텐츠 구매 (USDT 사용)
    println!("4. 콘텐츠 구매 중");
    println!("  구매할 콘텐츠 타입: {}", content_type);
    println!("  필요한 가격: {}", price);

    // USDT를 사용하므로 value()를 사용하지 않음
    let purchase_call = contract.purchase_content(content_type);
    let purchase_result = purchase_call.send().await;
    match purchase_result {
        Ok(pending) => {
            if let Some(receipt) = pending.await? {
                println!("  ✓ 구매 성공! 트랜잭션 해시: {:?}", receipt.transaction_hash);
            } else {
                println!("  ✓ 구매 트랜잭션 전송 완료");
            }
        }
        Err(e) => {
            println!("  ✗ 구매 실패: {:?}", e);
            return Ok(());
        }
    }
    println!();

    // 5. 권한 확인
    println!("5. 권한 확인...");
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

    // 6. 컨트랙트 USDT 잔액 확인 (ERC20 직접 호출)
    println!("6. 컨트랙트 USDT 잔액 확인...");
    let usdt_balance_result = erc20_contract
        .balance_of(address)
        .call()
        .await;
    match usdt_balance_result {
        Ok(balance) => {
            println!("  컨트랙트 현재 USDT 잔액: {}", balance);
        }
        Err(e) => {
            println!("  USDT 잔액 조회 실패: {:?}", e);
        }
    }
    println!();

    println!("=== 테스트 완료 ===");
    Ok(())
}

