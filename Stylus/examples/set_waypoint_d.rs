//! 개인키 주소가 가진 Token ID들의 waypoint를 D로 변경하는 예제
//! 
//! 사용법:
//!   cargo run --example set_waypoint_d
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
    types::{Address, U256},
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

const WAYPOINT_D: u64 = 4; // D = 4

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
            function getOwnerTokenCount(address owner) external view returns (uint256)
            function getOwnerTokenAtIndex(address owner, uint256 index) external view returns (uint256)
            function getWaypoint(uint256 tokenId) external view returns (uint256)
            function setWaypoint(uint256 tokenId, uint64 waypoint) external
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

    println!("=== Waypoint D 설정 예제 ===");
    println!("컨트랙트 주소: {:?}", address);
    println!("내 주소: {:?}\n", my_address);

    // 1. 내가 가진 Token 개수 확인
    println!("1. 내가 가진 Token 개수 조회 중...");
    let token_count_result = contract.get_owner_token_count(my_address).call().await?;
    let token_count = token_count_result;
    println!("  Token 개수: {}\n", token_count);

    let zero = U256::from(0);
    if token_count == zero {
        println!("  ⚠ 가지고 있는 Token이 없습니다.");
        return Ok(());
    }

    // 2. 각 Token ID의 Waypoint를 D로 설정
    println!("2. 각 Token ID의 Waypoint를 D로 설정 중...");
    let token_count_u64 = token_count.as_u64();
    for i in 0..token_count_u64 {
        let index = U256::from(i);
        
        // Token ID 가져오기
        let token_id_result = contract.get_owner_token_at_index(my_address, index).call().await?;
        let token_id = token_id_result;
        
        if token_id == zero {
            continue;
        }
        
        // 현재 Waypoint 확인
        let current_waypoint_result = contract.get_waypoint(token_id).call().await?;
        let current_waypoint = current_waypoint_result;
        println!("  Token ID {}: 현재 Waypoint = {}", token_id, current_waypoint);
        
        // Waypoint를 D로 설정
        println!("    → Waypoint D(4)로 변경 중...");
        match contract.set_waypoint(token_id, WAYPOINT_D).send().await {
            Ok(pending) => {
                let receipt = pending.await?;
                if let Some(r) = receipt {
                    println!("    ✓ 성공! 트랜잭션 해시: {:?}", r.transaction_hash);
                } else {
                    println!("    ✓ 트랜잭션 전송 완료");
                }
            }
            Err(e) => {
                println!("    ✗ 실패: {:?}\n", e);
                continue;
            }
        }
        
        // 변경 확인
        let new_waypoint_result = contract.get_waypoint(token_id).call().await?;
        let new_waypoint = new_waypoint_result;
        println!("    ✓ 확인: 새로운 Waypoint = {} (D)\n", new_waypoint);
    }

    println!("=== 완료 ===");
    Ok(())
}

